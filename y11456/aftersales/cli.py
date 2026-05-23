import os
import sys
import traceback
import click
from tabulate import tabulate

from .database import init_db, get_db_path
from .models import (
    create_batch, get_batch, list_batches, get_batch_stats,
    get_aftersales_orders, get_order_by_id, unfreeze_order
)
from .importer import (
    import_file, consolidate_orders, ImportError,
    DuplicateFileError, get_file_type_display
)
from .checker import (
    run_checks, manual_adjust, CheckError,
    get_failed_details
)
from .reporter import (
    generate_report, format_report_text, export_to_excel,
    freeze_failed_orders, get_order_history, ReportError
)


@click.group()
@click.version_option()
def main():
    """社区团购售后多源导入巡检 CLI 工具"""
    pass


@main.command()
@click.option('--desc', default='', help='批次描述')
def init(desc):
    """初始化数据库并创建新的巡检批次"""
    try:
        init_db()
        batch_no = create_batch(desc)
        click.echo(f"\n✅ 初始化完成！")
        click.echo(f"   数据库路径: {get_db_path()}")
        click.echo(f"   新批次号: {batch_no}")
        click.echo(f"\n📝 下一步操作:")
        click.echo(f"   aftersales import --batch {batch_no} --type leader_refund 团长退款表.xlsx")
    except Exception as e:
        click.echo(f"❌ 初始化失败: {str(e)}", err=True)
        sys.exit(1)


@main.command('import')
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--batch', required=True, help='批次号')
@click.option('--type', 'file_type', required=True,
              type=click.Choice(['leader_refund', 'warehouse_review', 'user_remark']),
              help='文件类型')
@click.option('--consolidate/--no-consolidate', default=True, help='导入后自动合并订单')
def import_cmd(file_path, batch, file_type, consolidate):
    """导入数据文件（团长退款表/仓库复核表/用户备注）"""
    try:
        if not get_batch(batch):
            click.echo(f"❌ 批次不存在: {batch}", err=True)
            sys.exit(1)
        
        file_name = os.path.basename(file_path)
        type_display = get_file_type_display(file_type)
        click.echo(f"\n📥 正在导入 [{type_display}]: {file_name}")
        
        success_count, failed_records = import_file(batch, file_path, file_type)
        
        click.echo(f"   成功导入: {success_count} 条记录")
        
        if failed_records:
            click.echo(f"\n⚠️  部分记录导入失败 ({len(failed_records)} 条):")
            for fail in failed_records[:5]:
                click.echo(f"   第{fail['row_no']}行: {fail['error']}")
            if len(failed_records) > 5:
                click.echo(f"   ... 还有 {len(failed_records) - 5} 条失败记录")
        
        if consolidate and success_count > 0:
            click.echo(f"\n🔄 正在合并多源数据...")
            consolidated, issues = consolidate_orders(batch)
            click.echo(f"   合并完成，生成 {consolidated} 条售后订单")
            if issues:
                click.echo(f"   合并时发现 {len(issues)} 个问题")
        
        click.echo(f"\n✅ 导入完成！")
        
    except DuplicateFileError as e:
        click.echo(f"⚠️  {str(e)}", err=True)
        click.echo("   这是保护机制，防止重复导入相同文件")
        sys.exit(0)
    except ImportError as e:
        click.echo(f"❌ 导入失败: {str(e)}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ 发生未预期的错误: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


@main.command()
@click.option('--batch', required=True, help='批次号')
def check(batch):
    """对批次数据进行合规性检查"""
    try:
        if not get_batch(batch):
            click.echo(f"❌ 批次不存在: {batch}", err=True)
            sys.exit(1)
        
        click.echo(f"\n🔍 正在对批次 [{batch}] 进行检查...")
        
        passed, failed, failed_orders = run_checks(batch)
        
        click.echo(f"\n📊 检查结果:")
        click.echo(f"   通过: {passed} 单")
        click.echo(f"   失败: {failed} 单")
        
        if failed_orders:
            click.echo(f"\n❌ 失败清单 ({len(failed_orders)} 单):")
            for idx, order in enumerate(failed_orders[:10], 1):
                click.echo(f"\n   {idx}. 订单号: {order['order_no']}")
                click.echo(f"      商品: {order['sku_code']} - {order['sku_name']}")
                for failure in order['failures']:
                    click.echo(f"      - {failure}")
            if len(failed_orders) > 10:
                click.echo(f"\n   ... 还有 {len(failed_orders) - 10} 条失败记录")
                click.echo(f"   使用 'aftersales report --batch {batch}' 查看完整清单")
        
        click.echo(f"\n✅ 检查完成！")
        
    except CheckError as e:
        click.echo(f"❌ 检查失败: {str(e)}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ 发生未预期的错误: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


@main.group()
def fix():
    """人工修复/改判命令"""
    pass


@fix.command('amount')
@click.argument('order_id', type=int)
@click.argument('new_amount', type=float)
@click.option('--operator', default='system', help='操作人')
@click.option('--reason', default='人工改判', help='改判原因')
def fix_amount(order_id, new_amount, operator, reason):
    """修改订单退款金额"""
    try:
        order = get_order_by_id(order_id)
        if not order:
            click.echo(f"❌ 订单不存在: {order_id}", err=True)
            sys.exit(1)
        
        old_amount = order.get('combined_refund_amount', 0)
        manual_adjust(order_id, 'combined_refund_amount', str(new_amount), operator, reason)
        
        click.echo(f"\n✅ 金额改判完成！")
        click.echo(f"   订单ID: {order_id}")
        click.echo(f"   订单号: {order['order_no']}")
        click.echo(f"   原值: ¥{old_amount}")
        click.echo(f"   新值: ¥{new_amount}")
        click.echo(f"   操作人: {operator}")
        click.echo(f"   原因: {reason}")
        
    except CheckError as e:
        click.echo(f"❌ 改判失败: {str(e)}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ 发生未预期的错误: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


@fix.command('type')
@click.argument('order_id', type=int)
@click.argument('new_type')
@click.option('--operator', default='system', help='操作人')
@click.option('--reason', default='人工改判', help='改判原因')
def fix_type(order_id, new_type, operator, reason):
    """修改订单问题类型"""
    try:
        order = get_order_by_id(order_id)
        if not order:
            click.echo(f"❌ 订单不存在: {order_id}", err=True)
            sys.exit(1)
        
        old_type = order.get('final_problem_type', '')
        manual_adjust(order_id, 'final_problem_type', new_type, operator, reason)
        
        click.echo(f"\n✅ 问题类型改判完成！")
        click.echo(f"   订单ID: {order_id}")
        click.echo(f"   订单号: {order['order_no']}")
        click.echo(f"   原值: {old_type}")
        click.echo(f"   新值: {new_type}")
        click.echo(f"   操作人: {operator}")
        click.echo(f"   原因: {reason}")
        
    except CheckError as e:
        click.echo(f"❌ 改判失败: {str(e)}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ 发生未预期的错误: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


@fix.command('status')
@click.argument('order_id', type=int)
@click.argument('new_status', type=click.Choice(['passed', 'failed', 'manual']))
@click.option('--operator', default='system', help='操作人')
@click.option('--reason', default='人工改判', help='改判原因')
def fix_status(order_id, new_status, operator, reason):
    """修改订单核验状态"""
    try:
        order = get_order_by_id(order_id)
        if not order:
            click.echo(f"❌ 订单不存在: {order_id}", err=True)
            sys.exit(1)
        
        old_status = order.get('status', '')
        manual_adjust(order_id, 'status', new_status, operator, reason)
        
        status_map = {'passed': '通过', 'failed': '失败', 'manual': '人工判定'}
        click.echo(f"\n✅ 状态改判完成！")
        click.echo(f"   订单ID: {order_id}")
        click.echo(f"   订单号: {order['order_no']}")
        click.echo(f"   原值: {status_map.get(old_status, old_status)}")
        click.echo(f"   新值: {status_map.get(new_status, new_status)}")
        click.echo(f"   操作人: {operator}")
        click.echo(f"   原因: {reason}")
        
    except CheckError as e:
        click.echo(f"❌ 改判失败: {str(e)}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ 发生未预期的错误: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


@fix.command('freeze')
@click.option('--batch', help='批次号（冻结该批次所有失败订单）')
@click.argument('order_id', type=int, required=False)
@click.option('--operator', default='system', help='操作人')
def freeze_cmd(batch, order_id, operator):
    """冻结订单（导出前锁定）"""
    try:
        if batch:
            if not get_batch(batch):
                click.echo(f"❌ 批次不存在: {batch}", err=True)
                sys.exit(1)
            
            frozen_count, frozen_ids = freeze_failed_orders(batch, operator)
            click.echo(f"\n✅ 已冻结 {frozen_count} 条失败订单")
            click.echo(f"   批次号: {batch}")
            click.echo(f"   操作人: {operator}")
        
        elif order_id:
            order = get_order_by_id(order_id)
            if not order:
                click.echo(f"❌ 订单不存在: {order_id}", err=True)
                sys.exit(1)
            
            from .models import freeze_order
            freeze_order(order_id, operator)
            click.echo(f"\n✅ 订单已冻结")
            click.echo(f"   订单ID: {order_id}")
            click.echo(f"   订单号: {order['order_no']}")
        
        else:
            click.echo("❌ 请指定 --batch 或 order_id", err=True)
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"❌ 冻结失败: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


@fix.command('unfreeze')
@click.argument('order_id', type=int)
@click.option('--operator', default='system', help='操作人')
def unfreeze_cmd(order_id, operator):
    """解冻订单"""
    try:
        order = get_order_by_id(order_id)
        if not order:
            click.echo(f"❌ 订单不存在: {order_id}", err=True)
            sys.exit(1)
        
        unfreeze_order(order_id, operator)
        click.echo(f"\n✅ 订单已解冻")
        click.echo(f"   订单ID: {order_id}")
        click.echo(f"   订单号: {order['order_no']}")
        
    except Exception as e:
        click.echo(f"❌ 解冻失败: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


@main.command()
@click.option('--batch', help='批次号')
@click.option('--full', is_flag=True, help='显示完整失败清单')
def report(batch, full):
    """生成巡检报告"""
    try:
        if batch:
            if not get_batch(batch):
                click.echo(f"❌ 批次不存在: {batch}", err=True)
                sys.exit(1)
            
            report_data = generate_report(batch)
            report_text = format_report_text(report_data)
            click.echo(report_text)
        else:
            batches = list_batches(10)
            if not batches:
                click.echo("暂无批次记录，请先运行 'aftersales init'")
                return
            
            table_data = []
            for b in batches:
                stats = get_batch_stats(b['id'])
                table_data.append([
                    b['batch_no'],
                    b['created_at'][:19],
                    stats.get('total', 0),
                    stats.get('passed', 0),
                    stats.get('failed', 0),
                    stats.get('frozen', 0),
                    stats.get('exported', 0),
                    b.get('status', 'active')
                ])
            
            headers = ['批次号', '创建时间', '总数', '通过', '失败', '冻结', '已导出', '状态']
            click.echo("\n📋 历史批次列表:\n")
            click.echo(tabulate(table_data, headers=headers, tablefmt='simple'))
        
    except ReportError as e:
        click.echo(f"❌ 生成报告失败: {str(e)}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ 发生未预期的错误: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


@main.command()
@click.argument('order_id', type=int, required=False)
@click.option('--batch', help='查看指定批次的订单变更历史')
@click.option('--limit', default=20, help='显示记录数')
def history(order_id, batch, limit):
    """查看订单/批次变更历史"""
    try:
        if order_id:
            history_data = get_order_history(order_id)
            order = history_data['order']
            
            click.echo(f"\n📜 订单详情:")
            click.echo(f"   订单ID: {order_id}")
            click.echo(f"   订单号: {order['order_no']}")
            click.echo(f"   商品: {order['sku_code']} - {order.get('sku_name', '')}")
            click.echo(f"   当前状态: {order.get('status', '')}")
            click.echo(f"   问题类型: {order.get('final_problem_type', '')}")
            click.echo(f"   退款金额: ¥{order.get('combined_refund_amount', 0)}")
            click.echo(f"   已冻结: {'是' if order.get('is_frozen') else '否'}")
            
            if history_data['check_results']:
                click.echo(f"\n🔍 核验记录:")
                for cr in history_data['check_results']:
                    status_icon = '✅' if cr['check_result'] == 'pass' else '❌'
                    click.echo(f"   {status_icon} [{cr['check_type']}] {cr['detail']} ({cr['created_at'][:19]})")
            
            if history_data['adjustments']:
                click.echo(f"\n🔧 改判记录:")
                for adj in history_data['adjustments']:
                    click.echo(f"   - [{adj['adjust_type']}] {adj['old_value']} -> {adj['new_value']}")
                    click.echo(f"     原因: {adj.get('reason', '无')} 操作人: {adj.get('operator', 'system')}")
                    click.echo(f"     时间: {adj['created_at'][:19]}")
        
        elif batch:
            if not get_batch(batch):
                click.echo(f"❌ 批次不存在: {batch}", err=True)
                sys.exit(1)
            
            orders = get_aftersales_orders(get_batch(batch)['id'])
            table_data = []
            
            for order in orders[:limit]:
                from .models import get_adjustments
                adjustments = get_adjustments(order['id'])
                table_data.append([
                    order['id'],
                    order['order_no'],
                    order['sku_code'],
                    order.get('status', ''),
                    order.get('final_problem_type', ''),
                    f"¥{order.get('combined_refund_amount', 0)}",
                    len(adjustments),
                    '是' if order.get('is_frozen') else '否'
                ])
            
            headers = ['ID', '订单号', '商品编码', '状态', '问题类型', '金额', '改判次数', '冻结']
            click.echo(f"\n📋 批次 [{batch}] 订单列表:\n")
            click.echo(tabulate(table_data, headers=headers, tablefmt='simple'))
            
        else:
            click.echo("请指定 --order_id 或 --batch 参数")
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"❌ 查询历史失败: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


@main.command()
@click.option('--batch', required=True, help='批次号')
@click.option('--output', '-o', default='./export', help='输出目录')
@click.option('--operator', default='system', help='操作人')
def export(batch, output, operator):
    """导出最终数据（按问题类型分文件）"""
    try:
        if not get_batch(batch):
            click.echo(f"❌ 批次不存在: {batch}", err=True)
            sys.exit(1)
        
        click.echo(f"\n📤 正在导出批次 [{batch}]...")
        click.echo(f"   输出目录: {os.path.abspath(output)}")
        
        result = export_to_excel(batch, output, operator)
        
        click.echo(f"\n✅ 导出完成！")
        click.echo(f"   导出时间: {result['exported_at']}")
        click.echo(f"   总导出数: {result['total_exported']} 单")
        click.echo(f"\n📁 导出文件:")
        
        for ptype, filepath in result['files'].items():
            click.echo(f"   - [{ptype}]: {os.path.abspath(filepath)}")
        
    except ReportError as e:
        click.echo(f"❌ 导出失败: {str(e)}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ 发生未预期的错误: {str(e)}", err=True)
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
