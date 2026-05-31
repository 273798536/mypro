#!/usr/bin/env python3
import sqlite3
import json
import os
import hashlib
from datetime import datetime, date
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import click
from dateutil.parser import parse as date_parse

DB_PATH = Path.home() / '.band_equipment' / 'equipment.db'
SOURCE_DIR = Path.cwd() / 'source_files'


class DatabaseManager:
    def __init__(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        SOURCE_DIR.mkdir(exist_ok=True)
        self.conn = sqlite3.connect(str(DB_PATH))
        self.conn.row_factory = sqlite3.Row
        self._init_tables()

    def _init_tables(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS source_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                file_hash TEXT NOT NULL UNIQUE,
                import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                content TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS equipment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT,
                status TEXT DEFAULT 'available',
                source_file_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source_file_id) REFERENCES source_files(id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                instrument TEXT,
                status TEXT DEFAULT 'active',
                source_file_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source_file_id) REFERENCES source_files(id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                performance_date DATE NOT NULL,
                location TEXT,
                source_file_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source_file_id) REFERENCES source_files(id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS borrow_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                equipment_id INTEGER NOT NULL,
                member_id INTEGER NOT NULL,
                borrow_date DATE NOT NULL,
                expected_return_date DATE,
                actual_return_date DATE,
                status TEXT DEFAULT 'borrowed',
                purpose TEXT,
                performance_id INTEGER,
                source_file_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (equipment_id) REFERENCES equipment(id),
                FOREIGN KEY (member_id) REFERENCES members(id),
                FOREIGN KEY (performance_id) REFERENCES performances(id),
                FOREIGN KEY (source_file_id) REFERENCES source_files(id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS maintenance_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                equipment_id INTEGER NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE,
                description TEXT,
                status TEXT DEFAULT 'in_progress',
                source_file_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (equipment_id) REFERENCES equipment(id),
                FOREIGN KEY (source_file_id) REFERENCES source_files(id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conflicts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_type TEXT NOT NULL,
                record_id INTEGER NOT NULL,
                conflict_type TEXT NOT NULL,
                message TEXT NOT NULL,
                resolved BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS operation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation TEXT NOT NULL,
                details TEXT,
                source_file_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source_file_id) REFERENCES source_files(id)
            )
        ''')
        self.conn.commit()

    def close(self):
        self.conn.close()


class SourceFileManager:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def import_file(self, filepath: str) -> Tuple[int, bool]:
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {filepath}")
        
        content = path.read_text(encoding='utf-8')
        file_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
        
        cursor = self.db.conn.cursor()
        cursor.execute('SELECT id FROM source_files WHERE file_hash = ?', (file_hash,))
        existing = cursor.fetchone()
        
        if existing:
            return existing['id'], False
        
        cursor.execute(
            'INSERT INTO source_files (filename, file_hash, content) VALUES (?, ?, ?)',
            (path.name, file_hash, content)
        )
        self.db.conn.commit()
        return cursor.lastrowid, True

    def get_source_info(self, source_file_id: int) -> Optional[Dict]:
        cursor = self.db.conn.cursor()
        cursor.execute('SELECT * FROM source_files WHERE id = ?', (source_file_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


class EquipmentManager:
    def __init__(self, db_manager: DatabaseManager, source_manager: SourceFileManager):
        self.db = db_manager
        self.source_manager = source_manager

    def add_equipment(self, name: str, category: str, source_file_id: Optional[int] = None) -> int:
        cursor = self.db.conn.cursor()
        cursor.execute(
            'INSERT INTO equipment (name, category, source_file_id) VALUES (?, ?, ?)',
            (name, category, source_file_id)
        )
        self.db.conn.commit()
        return cursor.lastrowid

    def get_all_equipment(self) -> List[Dict]:
        cursor = self.db.conn.cursor()
        cursor.execute('SELECT * FROM equipment ORDER BY name')
        return [dict(row) for row in cursor.fetchall()]

    def get_equipment_status(self, equipment_id: int, check_date: Optional[date] = None) -> Dict[str, Any]:
        check_date = check_date or date.today()
        cursor = self.db.conn.cursor()
        
        cursor.execute('SELECT * FROM equipment WHERE id = ?', (equipment_id,))
        equipment = cursor.fetchone()
        if not equipment:
            raise ValueError(f"设备不存在: {equipment_id}")
        
        cursor.execute('''
            SELECT * FROM borrow_records 
            WHERE equipment_id = ? AND status = 'borrowed'
            ORDER BY borrow_date DESC LIMIT 1
        ''', (equipment_id,))
        borrow_record = cursor.fetchone()
        
        cursor.execute('''
            SELECT * FROM maintenance_records 
            WHERE equipment_id = ? AND status = 'in_progress'
            ORDER BY start_date DESC LIMIT 1
        ''', (equipment_id,))
        maintenance_record = cursor.fetchone()
        
        is_overdue = False
        if borrow_record and borrow_record['expected_return_date']:
            expected_return = date_parse(borrow_record['expected_return_date']).date()
            is_overdue = check_date > expected_return
        
        return {
            'equipment': dict(equipment),
            'is_borrowed': borrow_record is not None,
            'borrow_record': dict(borrow_record) if borrow_record else None,
            'is_in_maintenance': maintenance_record is not None,
            'maintenance_record': dict(maintenance_record) if maintenance_record else None,
            'is_overdue': is_overdue,
            'status': 'overdue' if is_overdue else 
                     'borrowed' if borrow_record else 
                     'maintenance' if maintenance_record else 'available'
        }


class MemberManager:
    def __init__(self, db_manager: DatabaseManager, source_manager: SourceFileManager):
        self.db = db_manager
        self.source_manager = source_manager

    def add_member(self, name: str, instrument: str, source_file_id: Optional[int] = None) -> int:
        cursor = self.db.conn.cursor()
        cursor.execute(
            'INSERT INTO members (name, instrument, source_file_id) VALUES (?, ?, ?)',
            (name, instrument, source_file_id)
        )
        self.db.conn.commit()
        return cursor.lastrowid

    def update_member_status(self, member_id: int, status: str) -> None:
        cursor = self.db.conn.cursor()
        cursor.execute(
            'UPDATE members SET status = ? WHERE id = ?',
            (status, member_id)
        )
        self.db.conn.commit()

    def get_all_members(self) -> List[Dict]:
        cursor = self.db.conn.cursor()
        cursor.execute('SELECT * FROM members ORDER BY name')
        return [dict(row) for row in cursor.fetchall()]


class PerformanceManager:
    def __init__(self, db_manager: DatabaseManager, source_manager: SourceFileManager):
        self.db = db_manager
        self.source_manager = source_manager

    def add_performance(self, name: str, performance_date: str, location: str = '', 
                       source_file_id: Optional[int] = None) -> int:
        cursor = self.db.conn.cursor()
        cursor.execute(
            'INSERT INTO performances (name, performance_date, location, source_file_id) VALUES (?, ?, ?, ?)',
            (name, performance_date, location, source_file_id)
        )
        self.db.conn.commit()
        return cursor.lastrowid

    def get_upcoming_performances(self, days: int = 30) -> List[Dict]:
        cursor = self.db.conn.cursor()
        today = date.today().isoformat()
        cursor.execute('''
            SELECT * FROM performances 
            WHERE performance_date >= ? 
            ORDER BY performance_date ASC LIMIT ?
        ''', (today, days))
        return [dict(row) for row in cursor.fetchall()]


class BorrowManager:
    def __init__(self, db_manager: DatabaseManager, equipment_manager: EquipmentManager,
                 source_manager: SourceFileManager):
        self.db = db_manager
        self.equipment_manager = equipment_manager
        self.source_manager = source_manager
        self.conflict_manager = ConflictManager(db_manager)

    def borrow_equipment(self, equipment_id: int, member_id: int, borrow_date: str,
                        expected_return_date: Optional[str] = None, purpose: str = '',
                        performance_id: Optional[int] = None, 
                        source_file_id: Optional[int] = None) -> Tuple[Optional[int], List[str]]:
        conflicts = []
        errors = []
        status = self.equipment_manager.get_equipment_status(equipment_id)
        
        if status['is_borrowed']:
            errors.append(f"设备当前已借出 (记录ID: {status['borrow_record']['id']})")
        
        if status['is_in_maintenance']:
            errors.append(f"设备正在维修中 (记录ID: {status['maintenance_record']['id']})")
        
        cursor = self.db.conn.cursor()
        cursor.execute('SELECT status FROM members WHERE id = ?', (member_id,))
        member = cursor.fetchone()
        if member and member['status'] == 'left':
            conflicts.append("该成员已离队")
        
        if errors:
            for error_msg in errors:
                self.conflict_manager.add_conflict('borrow', 0, 'equipment_unavailable', error_msg)
            return None, errors + conflicts
        
        cursor.execute('''
            INSERT INTO borrow_records 
            (equipment_id, member_id, borrow_date, expected_return_date, purpose, performance_id, source_file_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (equipment_id, member_id, borrow_date, expected_return_date, purpose, performance_id, source_file_id))
        record_id = cursor.lastrowid
        
        cursor.execute('UPDATE equipment SET status = ? WHERE id = ?', ('borrowed', equipment_id))
        self.db.conn.commit()
        
        for conflict_msg in conflicts:
            self.conflict_manager.add_conflict('borrow', record_id, 'member_left', conflict_msg)
        
        return record_id, conflicts

    def return_equipment(self, equipment_id: int, return_date: Optional[str] = None,
                        source_file_id: Optional[int] = None) -> Optional[int]:
        return_date = return_date or date.today().isoformat()
        cursor = self.db.conn.cursor()
        
        cursor.execute('''
            SELECT * FROM borrow_records 
            WHERE equipment_id = ? AND status = 'borrowed'
            ORDER BY borrow_date DESC LIMIT 1
        ''', (equipment_id,))
        record = cursor.fetchone()
        
        if not record:
            return None
        
        cursor.execute('''
            UPDATE borrow_records 
            SET actual_return_date = ?, status = 'returned'
            WHERE id = ?
        ''', (return_date, record['id']))
        
        cursor.execute('UPDATE equipment SET status = ? WHERE id = ?', ('available', equipment_id))
        self.db.conn.commit()
        
        return record['id']

    def get_overdue_equipment(self) -> List[Dict]:
        today = date.today().isoformat()
        cursor = self.db.conn.cursor()
        cursor.execute('''
            SELECT br.*, e.name as equipment_name, m.name as member_name
            FROM borrow_records br
            JOIN equipment e ON br.equipment_id = e.id
            JOIN members m ON br.member_id = m.id
            WHERE br.status = 'borrowed' 
            AND br.expected_return_date IS NOT NULL 
            AND br.expected_return_date < ?
            ORDER BY br.expected_return_date
        ''', (today,))
        return [dict(row) for row in cursor.fetchall()]

    def get_borrow_history(self, equipment_id: Optional[int] = None, 
                          member_id: Optional[int] = None) -> List[Dict]:
        cursor = self.db.conn.cursor()
        query = '''
            SELECT br.*, e.name as equipment_name, m.name as member_name,
                   s.filename as source_filename
            FROM borrow_records br
            JOIN equipment e ON br.equipment_id = e.id
            JOIN members m ON br.member_id = m.id
            LEFT JOIN source_files s ON br.source_file_id = s.id
            WHERE 1=1
        '''
        params = []
        if equipment_id:
            query += ' AND br.equipment_id = ?'
            params.append(equipment_id)
        if member_id:
            query += ' AND br.member_id = ?'
            params.append(member_id)
        query += ' ORDER BY br.borrow_date DESC'
        
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


class ConflictManager:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def add_conflict(self, record_type: str, record_id: int, 
                    conflict_type: str, message: str) -> int:
        cursor = self.db.conn.cursor()
        cursor.execute('''
            INSERT INTO conflicts (record_type, record_id, conflict_type, message)
            VALUES (?, ?, ?, ?)
        ''', (record_type, record_id, conflict_type, message))
        self.db.conn.commit()
        return cursor.lastrowid

    def get_unresolved_conflicts(self) -> List[Dict]:
        cursor = self.db.conn.cursor()
        cursor.execute('''
            SELECT * FROM conflicts 
            WHERE resolved = 0 
            ORDER BY created_at DESC
        ''')
        return [dict(row) for row in cursor.fetchall()]

    def resolve_conflict(self, conflict_id: int) -> None:
        cursor = self.db.conn.cursor()
        cursor.execute('UPDATE conflicts SET resolved = 1 WHERE id = ?', (conflict_id,))
        self.db.conn.commit()


class MaintenanceManager:
    def __init__(self, db_manager: DatabaseManager, equipment_manager: EquipmentManager,
                 source_manager: SourceFileManager):
        self.db = db_manager
        self.equipment_manager = equipment_manager
        self.source_manager = source_manager
        self.conflict_manager = ConflictManager(db_manager)

    def start_maintenance(self, equipment_id: int, start_date: str, description: str = '',
                         source_file_id: Optional[int] = None) -> Tuple[Optional[int], List[str]]:
        errors = []
        status = self.equipment_manager.get_equipment_status(equipment_id)
        
        if status['is_borrowed']:
            errors.append(f"设备当前已借出 (记录ID: {status['borrow_record']['id']})，请先归还再安排维修")
        
        if status['is_in_maintenance']:
            errors.append(f"设备已有进行中的维修记录 (记录ID: {status['maintenance_record']['id']})")
        
        if errors:
            for error_msg in errors:
                self.conflict_manager.add_conflict('maintenance', 0, 'maintenance_conflict', error_msg)
            return None, errors
        
        cursor = self.db.conn.cursor()
        cursor.execute('''
            INSERT INTO maintenance_records 
            (equipment_id, start_date, description, source_file_id)
            VALUES (?, ?, ?, ?)
        ''', (equipment_id, start_date, description, source_file_id))
        record_id = cursor.lastrowid
        
        cursor.execute('UPDATE equipment SET status = ? WHERE id = ?', ('maintenance', equipment_id))
        self.db.conn.commit()
        
        return record_id, []

    def finish_maintenance(self, maintenance_id: int, end_date: Optional[str] = None) -> bool:
        end_date = end_date or date.today().isoformat()
        cursor = self.db.conn.cursor()
        
        cursor.execute('SELECT * FROM maintenance_records WHERE id = ?', (maintenance_id,))
        record = cursor.fetchone()
        if not record:
            return False
        
        cursor.execute('''
            UPDATE maintenance_records 
            SET end_date = ?, status = 'completed'
            WHERE id = ?
        ''', (end_date, maintenance_id))
        
        cursor.execute('''
            SELECT COUNT(*) as cnt FROM borrow_records 
            WHERE equipment_id = ? AND status = 'borrowed'
        ''', (record['equipment_id'],))
        has_borrowed = cursor.fetchone()['cnt'] > 0
        
        if not has_borrowed:
            cursor.execute('UPDATE equipment SET status = ? WHERE id = ?', 
                          ('available', record['equipment_id']))
        
        self.db.conn.commit()
        return True

    def get_active_maintenance(self) -> List[Dict]:
        cursor = self.db.conn.cursor()
        cursor.execute('''
            SELECT mr.*, e.name as equipment_name
            FROM maintenance_records mr
            JOIN equipment e ON mr.equipment_id = e.id
            WHERE mr.status = 'in_progress'
            ORDER BY mr.start_date
        ''')
        return [dict(row) for row in cursor.fetchall()]


@click.group()
def cli():
    pass


@cli.command()
@click.argument('filepath', type=click.Path(exists=True))
def import_source(filepath):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    try:
        file_id, is_new = source_manager.import_file(filepath)
        if is_new:
            click.echo(f"✅ 成功导入源文件 (ID: {file_id})")
        else:
            click.echo(f"ℹ️  文件已存在，跳过重复导入 (ID: {file_id})")
    finally:
        db.close()


@cli.command()
@click.argument('name')
@click.argument('category')
@click.option('--source-id', type=int, help='关联的源文件ID')
def add_equipment(name, category, source_id):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    try:
        equipment_id = equipment_manager.add_equipment(name, category, source_id)
        click.echo(f"✅ 成功添加设备: {name} (ID: {equipment_id})")
    finally:
        db.close()


@cli.command()
def list_equipment():
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    try:
        equipment_list = equipment_manager.get_all_equipment()
        if not equipment_list:
            click.echo("📭 暂无设备记录")
            return
        click.echo("\n📋 设备台账:")
        click.echo("-" * 60)
        for eq in equipment_list:
            status_info = equipment_manager.get_equipment_status(eq['id'])
            status_str = {
                'available': '🟢 可借',
                'borrowed': '🟡 已借',
                'maintenance': '🔧 维修',
                'overdue': '🔴 逾期'
            }.get(status_info['status'], '❓ 未知')
            source = f" [来源:{eq['source_file_id']}]" if eq['source_file_id'] else ''
            click.echo(f"ID:{eq['id']:3d} | {eq['name']:20s} | {eq['category']:10s} | {status_str}{source}")
    finally:
        db.close()


@cli.command()
@click.argument('equipment_id', type=int)
def equipment_status(equipment_id):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    try:
        status = equipment_manager.get_equipment_status(equipment_id)
        eq = status['equipment']
        click.echo(f"\n📦 设备: {eq['name']} ({eq['category']})")
        click.echo(f"状态: {status['status']}")
        if status['is_borrowed']:
            br = status['borrow_record']
            click.echo(f"\n📤 出借中:")
            click.echo(f"  出借日期: {br['borrow_date']}")
            click.echo(f"  预计归还: {br['expected_return_date'] or '未设置'}")
            click.echo(f"  用途: {br['purpose'] or '未填写'}")
        if status['is_in_maintenance']:
            mr = status['maintenance_record']
            click.echo(f"\n🔧 维修中:")
            click.echo(f"  开始日期: {mr['start_date']}")
            click.echo(f"  描述: {mr['description'] or '未填写'}")
        if status['is_overdue']:
            click.echo("\n🔴 ⚠️ 设备已逾期归还!")
    except ValueError as e:
        click.echo(f"❌ {e}")
    finally:
        db.close()


@cli.command()
@click.argument('name')
@click.argument('instrument')
@click.option('--source-id', type=int, help='关联的源文件ID')
def add_member(name, instrument, source_id):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    member_manager = MemberManager(db, source_manager)
    try:
        member_id = member_manager.add_member(name, instrument, source_id)
        click.echo(f"✅ 成功添加成员: {name} (ID: {member_id})")
    finally:
        db.close()


@cli.command()
@click.argument('member_id', type=int)
@click.argument('status', type=click.Choice(['active', 'left', 'inactive']))
def update_member(member_id, status):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    member_manager = MemberManager(db, source_manager)
    try:
        member_manager.update_member_status(member_id, status)
        click.echo(f"✅ 成员状态已更新为: {status}")
    finally:
        db.close()


@cli.command()
def list_members():
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    member_manager = MemberManager(db, source_manager)
    try:
        members = member_manager.get_all_members()
        if not members:
            click.echo("📭 暂无成员记录")
            return
        click.echo("\n👥 成员列表:")
        click.echo("-" * 50)
        for m in members:
            status_icon = {'active': '🟢', 'left': '🚪', 'inactive': '⚪'}.get(m['status'], '❓')
            click.echo(f"ID:{m['id']:3d} | {m['name']:15s} | {m['instrument']:12s} | {status_icon} {m['status']}")
    finally:
        db.close()


@cli.command()
@click.argument('name')
@click.argument('performance_date')
@click.option('--location', default='', help='演出地点')
@click.option('--source-id', type=int, help='关联的源文件ID')
def add_performance(name, performance_date, location, source_id):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    perf_manager = PerformanceManager(db, source_manager)
    try:
        perf_id = perf_manager.add_performance(name, performance_date, location, source_id)
        click.echo(f"✅ 成功添加演出: {name} (ID: {perf_id})")
    finally:
        db.close()


@cli.command()
@click.option('--days', default=30, help='显示未来多少天的演出')
def upcoming_performances(days):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    perf_manager = PerformanceManager(db, source_manager)
    try:
        performances = perf_manager.get_upcoming_performances(days)
        if not performances:
            click.echo(f"📭 未来{days}天暂无演出安排")
            return
        click.echo(f"\n🎵 未来{days}天演出安排:")
        click.echo("-" * 60)
        for p in performances:
            click.echo(f"ID:{p['id']:3d} | {p['performance_date']} | {p['name']:25s} | {p['location']}")
    finally:
        db.close()


@cli.command()
@click.argument('equipment_id', type=int)
@click.argument('member_id', type=int)
@click.argument('borrow_date')
@click.option('--return-date', help='预计归还日期')
@click.option('--purpose', default='', help='出借用途')
@click.option('--performance-id', type=int, help='关联演出ID')
@click.option('--source-id', type=int, help='关联的源文件ID')
def borrow(equipment_id, member_id, borrow_date, return_date, purpose, performance_id, source_id):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    borrow_manager = BorrowManager(db, equipment_manager, source_manager)
    try:
        record_id, conflicts = borrow_manager.borrow_equipment(
            equipment_id, member_id, borrow_date, return_date, purpose, performance_id, source_id
        )
        if record_id is None:
            click.echo("❌ 无法创建借出记录:")
            for c in conflicts:
                click.echo(f"   • {c}")
        else:
            click.echo(f"✅ 出借记录已创建 (ID: {record_id})")
            if conflicts:
                click.echo("\n⚠️  注意:")
                for c in conflicts:
                    click.echo(f"   • {c}")
    finally:
        db.close()


@cli.command()
@click.argument('equipment_id', type=int)
@click.option('--return-date', help='实际归还日期')
def return_equipment(equipment_id, return_date):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    borrow_manager = BorrowManager(db, equipment_manager, source_manager)
    try:
        record_id = borrow_manager.return_equipment(equipment_id, return_date)
        if record_id:
            click.echo(f"✅ 设备已归还 (记录ID: {record_id})")
        else:
            click.echo("⚠️  该设备当前未被借出")
    finally:
        db.close()


@cli.command()
def overdue():
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    borrow_manager = BorrowManager(db, equipment_manager, source_manager)
    try:
        overdue_list = borrow_manager.get_overdue_equipment()
        if not overdue_list:
            click.echo("✅ 暂无逾期设备")
            return
        click.echo("\n🔴 逾期设备列表:")
        click.echo("-" * 70)
        for item in overdue_list:
            click.echo(f"记录ID:{item['id']:3d} | {item['equipment_name']:20s} | {item['member_name']:15s} | 应还:{item['expected_return_date']}")
    finally:
        db.close()


@cli.command()
@click.option('--equipment-id', type=int, help='按设备筛选')
@click.option('--member-id', type=int, help='按成员筛选')
def history(equipment_id, member_id):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    borrow_manager = BorrowManager(db, equipment_manager, source_manager)
    try:
        records = borrow_manager.get_borrow_history(equipment_id, member_id)
        if not records:
            click.echo("📭 暂无借还记录")
            return
        click.echo("\n📜 借还历史记录:")
        click.echo("-" * 80)
        for r in records:
            status_icon = {'borrowed': '🟡', 'returned': '✅', 'overdue': '🔴'}.get(r['status'], '❓')
            source_info = f" [来源:{r['source_filename']}]" if r['source_filename'] else ''
            click.echo(f"ID:{r['id']:3d} | {r['equipment_name']:18s} | {r['member_name']:15s} | {r['borrow_date']} → {r['actual_return_date'] or '未还'} | {status_icon} {r['status']}{source_info}")
    finally:
        db.close()


@cli.command()
@click.argument('equipment_id', type=int)
@click.argument('start_date')
@click.option('--description', default='', help='维修描述')
@click.option('--source-id', type=int, help='关联的源文件ID')
def start_maintenance(equipment_id, start_date, description, source_id):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    maintenance_manager = MaintenanceManager(db, equipment_manager, source_manager)
    try:
        record_id, conflicts = maintenance_manager.start_maintenance(
            equipment_id, start_date, description, source_id
        )
        if record_id is None:
            click.echo("❌ 无法创建维修记录:")
            for c in conflicts:
                click.echo(f"   • {c}")
        else:
            click.echo(f"✅ 维修记录已创建 (ID: {record_id})")
    finally:
        db.close()


@cli.command()
@click.argument('maintenance_id', type=int)
@click.option('--end-date', help='维修结束日期')
def finish_maintenance(maintenance_id, end_date):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    maintenance_manager = MaintenanceManager(db, equipment_manager, source_manager)
    try:
        if maintenance_manager.finish_maintenance(maintenance_id, end_date):
            click.echo(f"✅ 维修已完成")
        else:
            click.echo("❌ 未找到该维修记录")
    finally:
        db.close()


@cli.command()
def active_maintenance():
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    maintenance_manager = MaintenanceManager(db, equipment_manager, source_manager)
    try:
        records = maintenance_manager.get_active_maintenance()
        if not records:
            click.echo("✅ 暂无进行中的维修")
            return
        click.echo("\n🔧 进行中的维修:")
        click.echo("-" * 60)
        for r in records:
            click.echo(f"ID:{r['id']:3d} | {r['equipment_name']:20s} | 开始:{r['start_date']} | {r['description'] or '无描述'}")
    finally:
        db.close()


@cli.command()
def conflicts():
    db = DatabaseManager()
    conflict_manager = ConflictManager(db)
    try:
        conflicts_list = conflict_manager.get_unresolved_conflicts()
        if not conflicts_list:
            click.echo("✅ 暂无未解决的冲突")
            return
        click.echo("\n⚠️  未解决的冲突:")
        click.echo("-" * 70)
        for c in conflicts_list:
            click.echo(f"ID:{c['id']:3d} | [{c['record_type']}:{c['record_id']}] | {c['conflict_type']:20s} | {c['message']}")
    finally:
        db.close()


@cli.command()
@click.argument('conflict_id', type=int)
def resolve_conflict(conflict_id):
    db = DatabaseManager()
    conflict_manager = ConflictManager(db)
    try:
        conflict_manager.resolve_conflict(conflict_id)
        click.echo(f"✅ 冲突已标记为已解决")
    finally:
        db.close()


@cli.command()
@click.argument('source_id', type=int)
def source_info(source_id):
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    try:
        info = source_manager.get_source_info(source_id)
        if not info:
            click.echo("❌ 未找到该源文件记录")
            return
        click.echo(f"\n📄 源文件信息:")
        click.echo(f"  ID: {info['id']}")
        click.echo(f"  文件名: {info['filename']}")
        click.echo(f"  导入时间: {info['import_time']}")
        click.echo(f"  文件哈希: {info['file_hash']}")
        click.echo(f"\n内容预览:\n{info['content'][:200]}...")
    finally:
        db.close()


@cli.command()
def status():
    db = DatabaseManager()
    source_manager = SourceFileManager(db)
    equipment_manager = EquipmentManager(db, source_manager)
    member_manager = MemberManager(db, source_manager)
    borrow_manager = BorrowManager(db, equipment_manager, source_manager)
    maintenance_manager = MaintenanceManager(db, equipment_manager, source_manager)
    conflict_manager = ConflictManager(db)
    
    try:
        eq_list = equipment_manager.get_all_equipment()
        members = member_manager.get_all_members()
        overdue = borrow_manager.get_overdue_equipment()
        maintenance = maintenance_manager.get_active_maintenance()
        conflicts = conflict_manager.get_unresolved_conflicts()
        
        borrowed_count = sum(1 for eq in eq_list if equipment_manager.get_equipment_status(eq['id'])['is_borrowed'])
        maintenance_count = len(maintenance)
        available_count = len(eq_list) - borrowed_count - maintenance_count
        
        click.echo("\n" + "=" * 50)
        click.echo("🎸 校园乐队设备借还系统 - 状态总览")
        click.echo("=" * 50)
        click.echo(f"\n📦 设备:")
        click.echo(f"  总数: {len(eq_list)}")
        click.echo(f"  🟢 可借: {available_count}")
        click.echo(f"  🟡 已借: {borrowed_count}")
        click.echo(f"  🔧 维修中: {maintenance_count}")
        click.echo(f"  🔴 逾期: {len(overdue)}")
        click.echo(f"\n👥 成员: {len(members)}")
        click.echo(f"\n⚠️  冲突: {len(conflicts)}")
        click.echo("")
    finally:
        db.close()


if __name__ == '__main__':
    cli()
