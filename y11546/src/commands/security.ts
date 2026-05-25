import chalk from 'chalk';
import Table from 'cli-table3';
import { UserDAO, BatchFreezeDAO, OperationLockDAO } from '../db/securityDAO';
import { UserRole } from '../models/types';
import { permissionService } from '../services/permissionService';

interface UserOptions {
  list?: boolean;
  add?: string;
  remove?: string;
  role?: UserRole;
  workDir?: string;
  operator?: string;
}

export async function userCommand(options: UserOptions): Promise<number> {
  try {
    const userDAO = new UserDAO(options.workDir);
    const operator = options.operator || process.env.USER || 'admin';

    const permissionCheck = await permissionService.checkUserPermission(operator, 'manage_users');
    if (!permissionCheck.allowed) {
      console.error(chalk.red('权限不足: ' + (permissionCheck.reason || '没有管理用户权限')));
      return 1;
    }

    if (options.list) {
      const users = await userDAO.findAll();
      if (users.length === 0) {
        console.log(chalk.gray('暂无用户'));
        return 0;
      }

      console.log(chalk.blue('用户列表:'));
      console.log('');

      const table = new Table({
        head: ['ID', '用户名', '显示名', '角色', '状态'],
        colWidths: [10, 15, 15, 12, 10],
        wordWrap: true,
      });

      for (const user of users) {
        table.push([
          user.id?.slice(0, 8) || '-',
          user.username,
          user.display_name || '-',
          user.role,
          user.is_active ? chalk.green('启用') : chalk.red('禁用'),
        ]);
      }
      console.log(table.toString());

      return 0;
    }

    if (options.add) {
      if (!options.role) {
        console.error(chalk.red('请指定角色: --role <admin|manager|operator|viewer>'));
        return 1;
      }

      const existing = await userDAO.findByUsername(options.add);
      if (existing) {
        console.error(chalk.red('用户已存在: ' + options.add));
        return 1;
      }

      const id = await userDAO.createUser(options.add, options.role);
      console.log(chalk.green('用户已创建: ' + options.add + ' (' + options.role + ')'));
      console.log(chalk.gray('ID: ' + id));
      return 0;
    }

    if (options.remove) {
      const user = await userDAO.findByUsername(options.remove);
      if (!user) {
        console.error(chalk.red('用户不存在: ' + options.remove));
        return 1;
      }

      await userDAO.deactivate(user.id!);
      console.log(chalk.green('用户已禁用: ' + options.remove));
      return 0;
    }

    console.log(chalk.blue('用法:'));
    console.log('  ema user --list                    列出所有用户');
    console.log('  ema user --add <username> --role <role>  添加用户');
    console.log('  ema user --remove <username>       禁用用户');
    return 0;
  } catch (error: any) {
    console.error(chalk.red('操作失败:'), error.message);
    return 1;
  }
}

interface FreezeOptions {
  list?: boolean;
  freeze?: string;
  unfreeze?: string;
  reason?: string;
  workDir?: string;
  operator?: string;
}

export async function freezeCommand(options: FreezeOptions): Promise<number> {
  try {
    const freezeDAO = new BatchFreezeDAO(options.workDir);
    const operator = options.operator || process.env.USER || 'admin';

    if (options.list) {
      const freezes = await freezeDAO.findActiveFreezes();
      if (freezes.length === 0) {
        console.log(chalk.gray('暂无冻结的批次'));
        return 0;
      }

      console.log(chalk.blue('已冻结的批次:'));
      console.log('');

      const table = new Table({
        head: ['批次ID', '冻结人', '冻结时间', '原因'],
        colWidths: [12, 12, 20, 25],
        wordWrap: true,
      });

      for (const freeze of freezes) {
        table.push([
          freeze.batch_id?.slice(0, 10) || '-',
          freeze.frozen_by,
          new Date(freeze.frozen_at).toLocaleString(),
          freeze.reason || '-',
        ]);
      }
      console.log(table.toString());

      return 0;
    }

    if (options.freeze) {
      const permissionCheck = await permissionService.checkUserPermission(operator, 'freeze');
      if (!permissionCheck.allowed) {
        console.error(chalk.red('权限不足: ' + (permissionCheck.reason || '没有冻结权限')));
        return 1;
      }

      const isFrozen = await freezeDAO.isBatchFrozen(options.freeze);
      if (isFrozen) {
        console.log(chalk.yellow('批次已被冻结: ' + options.freeze));
        return 0;
      }

      const id = await freezeDAO.freezeBatch(options.freeze, operator, options.reason);
      console.log(chalk.green('批次已冻结: ' + options.freeze));
      console.log(chalk.gray('冻结ID: ' + id));
      return 0;
    }

    if (options.unfreeze) {
      const permissionCheck = await permissionService.checkUserPermission(operator, 'unfreeze');
      if (!permissionCheck.allowed) {
        console.error(chalk.red('权限不足: ' + (permissionCheck.reason || '没有解冻权限')));
        return 1;
      }

      await freezeDAO.unfreezeBatch(options.unfreeze, operator);
      console.log(chalk.green('批次已解冻: ' + options.unfreeze));
      return 0;
    }

    console.log(chalk.blue('用法:'));
    console.log('  ema freeze --list                  列出已冻结的批次');
    console.log('  ema freeze --freeze <batchId> [--reason <原因>]  冻结批次');
    console.log('  ema freeze --unfreeze <batchId>   解冻批次');
    return 0;
  } catch (error: any) {
    console.error(chalk.red('操作失败:'), error.message);
    return 1;
  }
}

interface LockOptions {
  list?: boolean;
  release?: string;
  workDir?: string;
  operator?: string;
}

export async function lockCommand(options: LockOptions): Promise<number> {
  try {
    const lockDAO = new OperationLockDAO(options.workDir);
    const operator = options.operator || process.env.USER || 'admin';

    if (options.list) {
      const locks = await lockDAO.findAllActive();
      if (locks.length === 0) {
        console.log(chalk.gray('暂无活跃的锁'));
        return 0;
      }

      console.log(chalk.blue('活跃锁列表:'));
      console.log('');

      const table = new Table({
        head: ['资源类型', '资源ID', '锁定人', '锁定时间', '过期时间'],
        colWidths: [12, 20, 12, 20, 20],
        wordWrap: true,
      });

      for (const lock of locks) {
        table.push([
          lock.resource_type,
          lock.resource_id,
          lock.locked_by,
          new Date(lock.locked_at).toLocaleString(),
          new Date(lock.expires_at).toLocaleString(),
        ]);
      }
      console.log(table.toString());

      return 0;
    }

    if (options.release) {
      const permissionCheck = await permissionService.checkUserPermission(operator, 'manage_users');
      if (!permissionCheck.allowed) {
        console.error(chalk.red('权限不足: 只有管理员可以释放锁'));
        return 1;
      }

      await lockDAO.releaseLock(options.release);
      console.log(chalk.green('锁已释放: ' + options.release));
      return 0;
    }

    console.log(chalk.blue('用法:'));
    console.log('  ema lock --list                   列出活跃锁');
    console.log('  ema lock --release <lockId>      释放指定锁');
    return 0;
  } catch (error: any) {
    console.error(chalk.red('操作失败:'), error.message);
    return 1;
  }
}
