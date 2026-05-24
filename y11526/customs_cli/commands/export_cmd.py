import click
import pandas as pd
from rich.panel import Panel
from ..database import get_session, Package, TrackingNode, TaxNotice, SupplierStatement


@click.command()
@click.argument("table", type=click.Choice([
    "packages", "tracking_nodes", "tax_notices", "supplier_statements", "all"
]))
@click.option("--output", "-o", required=True, type=click.Path(), help="输出文件路径 (.xlsx 或 .csv)")
@click.option("--batch", "-b", "batch_id", help="按批次过滤")
@click.option("--include-original-row", is_flag=True, help="包含原始行号列")
@click.pass_context
def export(ctx, table, output, batch_id, include_original_row):
    """导出数据为CSV/Excel"""
    console = ctx.obj["console"]
    session = get_session()

    try:
        def apply_batch_filter(query, model):
            if batch_id:
                return query.filter(model.batch_id == batch_id)
            return query

        is_excel = output.endswith(('.xlsx', '.xls'))

        if table == "all":
            if not is_excel:
                console.print("[red]导出全部数据时请使用 .xlsx 格式[/red]")
                return

            with pd.ExcelWriter(output) as writer:
                packages = apply_batch_filter(session.query(Package), Package).all()
                if packages:
                    df = pd.DataFrame([{
                        c.name: getattr(p, c.name)
                        for c in Package.__table__.columns
                        if include_original_row or c.name != 'original_row'
                    } for p in packages])
                    df.to_excel(writer, sheet_name="申报表", index=False)

                tracking = apply_batch_filter(session.query(TrackingNode), TrackingNode).all()
                if tracking:
                    df = pd.DataFrame([{
                        c.name: getattr(t, c.name)
                        for c in TrackingNode.__table__.columns
                        if include_original_row or c.name != 'original_row'
                    } for t in tracking])
                    df.to_excel(writer, sheet_name="轨迹节点", index=False)

                notices = apply_batch_filter(session.query(TaxNotice), TaxNotice).all()
                if notices:
                    df = pd.DataFrame([{
                        c.name: getattr(n, c.name)
                        for c in TaxNotice.__table__.columns
                        if include_original_row or c.name != 'original_row'
                    } for n in notices])
                    df.to_excel(writer, sheet_name="补税通知", index=False)

                statements = apply_batch_filter(session.query(SupplierStatement), SupplierStatement).all()
                if statements:
                    df = pd.DataFrame([{
                        c.name: getattr(s, c.name)
                        for c in SupplierStatement.__table__.columns
                        if include_original_row or c.name != 'original_row'
                    } for s in statements])
                    df.to_excel(writer, sheet_name="供应商对账单", index=False)
        else:
            model_map = {
                "packages": Package,
                "tracking_nodes": TrackingNode,
                "tax_notices": TaxNotice,
                "supplier_statements": SupplierStatement,
            }
            model = model_map[table]
            records = apply_batch_filter(session.query(model), model).all()

            if not records:
                console.print("[yellow]没有数据可导出[/yellow]")
                return

            df = pd.DataFrame([{
                c.name: getattr(r, c.name)
                for c in model.__table__.columns
                if include_original_row or c.name != 'original_row'
            } for r in records])

            if is_excel:
                df.to_excel(output, index=False)
            else:
                df.to_csv(output, index=False, encoding="utf-8-sig")

        console.print(Panel.fit(
            f"[green]导出成功！[/green]\n\n"
            f"表: {table}\n"
            f"批次: {batch_id or '全部'}\n"
            f"输出文件: {output}",
            title="数据导出"
        ))
    finally:
        session.close()
