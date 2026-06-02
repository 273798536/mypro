import pandas as pd
import numpy as np

"""
示例数据 - 模拟业务同事提交的不标准数据
包含：空值、旧备注、单位不统一、格式不规范
"""


def create_messy_ingredients() -> pd.DataFrame:
    """创建不标准的食材清单"""
    data = [
        {"id": "V001", "name": "大白菜", "category": "蔬菜", "cost": "3.5", "stock": "20", "unit": "kg", "allergens": "", "source": "本地采购", "notes": "新鲜"},
        {"id": "V002", "name": "胡萝卜", "category": "蔬菜", "cost": "4.2【上周价4.0】", "stock": "15", "unit": "kg", "allergens": "", "source": "本地采购", "notes": ""},
        {"id": "V003", "name": "土豆", "category": "蔬菜", "cost": "2.8", "stock": "", "unit": "kg", "allergens": "", "source": "", "notes": "空值测试"},
        {"id": "P001", "name": "猪里脊肉", "category": "肉类", "cost": "25.0", "stock": "5（预计明天到10kg）", "unit": "kg", "allergens": "", "source": "中央厨房", "notes": ""},
        {"id": "P002", "name": "鸡胸肉", "category": "肉类", "cost": "18.5", "stock": "0", "unit": "kg", "allergens": "", "source": "中央厨房", "notes": "缺货！"},
        {"id": "E001", "name": "鸡蛋", "category": "蛋类", "cost": "0.6", "stock": "30斤", "unit": "斤", "allergens": "鸡蛋,蛋白质过敏", "source": "本地采购", "notes": ""},
        {"id": "G001", "name": "大米", "category": "主食", "cost": "5.2", "stock": "50", "unit": "kg", "allergens": "小麦交叉污染", "source": "进口", "notes": ""},
        {"id": "G002", "name": "面粉", "category": "主食", "cost": "4.0", "stock": "30", "unit": "kg", "allergens": "小麦", "source": "本地采购", "notes": ""},
        {"id": "S001", "name": "大豆油", "category": "调料", "cost": "10.0", "stock": "10000克", "unit": "克", "allergens": "大豆", "source": "", "notes": "单位测试"},
        {"id": "S002", "name": "酱油", "category": "调料", "cost": "8.5", "stock": "5", "unit": "kg", "allergens": "大豆,小麦", "source": "本地采购", "notes": ""},
        {"id": "F001", "name": "花生", "category": "坚果", "cost": "15.0", "stock": "2", "unit": "kg", "allergens": "花生", "source": "进口", "notes": ""},
        {"id": "V004", "name": "西兰花", "category": "蔬菜", "cost": None, "stock": "8", "unit": "kg", "allergens": "无", "source": "本地采购", "notes": "成本空值"},
        {"id": "M001", "name": "牛奶", "category": "奶类", "cost": "12.0", "stock": "10", "unit": "kg", "allergens": "牛奶", "source": "本地采购", "notes": ""},
        {"id": "X001", "name": "", "category": "", "cost": "100", "stock": "100", "unit": "kg", "allergens": "", "source": "", "notes": "ID和名称缺失，应被删除"},
    ]
    df = pd.DataFrame(data)
    df.loc[3, "stock"] = np.nan
    df.loc[5, "cost"] = "nan"
    return df


def create_messy_nutrition() -> pd.DataFrame:
    """创建不标准的营养表（每kg食材的营养含量）"""
    data = [
        {"ingredient_id": "V001", "calories": "150", "protein": "1.5", "fat": "0.2", "carbs": "3.5", "sodium": "70", "fiber": "1.0", "sugar": "2.0"},
        {"ingredient_id": "V002", "calories": "410（可食部85%）", "protein": "0.9", "fat": "0.2", "carbs": "10.0", "sodium": "70", "fiber": "1.5", "sugar": "4.5"},
        {"ingredient_id": "V003", "calories": "770", "protein": "2.0", "fat": "0.1", "carbs": "17.0", "sodium": "", "fiber": "2.0", "sugar": "0.8"},
        {"ingredient_id": "P001", "calories": "1550", "protein": "20.0", "fat": "7.0", "carbs": "0.0", "sodium": "50", "fiber": "0", "sugar": "0"},
        {"ingredient_id": "P002", "calories": "1650", "protein": "31.0", "fat": "3.5", "carbs": "0.0", "sodium": "70", "fiber": "0", "sugar": "0"},
        {"ingredient_id": "E001", "calories": "1550【15个/斤】", "protein": "12.0", "fat": "11.0", "carbs": "1.2", "sodium": "130", "fiber": "0", "sugar": "1.0"},
        {"ingredient_id": "G001", "calories": "3650", "protein": "7.0", "fat": "0.5", "carbs": "79.0", "sodium": "5", "fiber": "0.5", "sugar": "0.5"},
        {"ingredient_id": "G002", "calories": "3640", "protein": "10.0", "fat": "1.0", "carbs": "76.0", "sodium": "5", "fiber": "2.5", "sugar": "0.5"},
        {"ingredient_id": "S001", "calories": "9000", "protein": "0", "fat": "100.0", "carbs": "0", "sodium": "0", "fiber": "0", "sugar": "0"},
        {"ingredient_id": "S002", "calories": "530", "protein": "6.0", "fat": "0.5", "carbs": "25.0", "sodium": "6000", "fiber": "1.0", "sugar": "15.0"},
        {"ingredient_id": "F001", "calories": "5600", "protein": "25.0", "fat": "44.0", "carbs": "16.0", "sodium": "20", "fiber": "6.0", "sugar": "5.0"},
        {"ingredient_id": "V004", "calories": "340", "protein": "2.8", "fat": "0.4", "carbs": "7.0", "sodium": "30", "fiber": "2.6", "sugar": "2.0"},
        {"ingredient_id": "M001", "calories": "540", "protein": "3.0", "fat": "3.2", "carbs": "5.0", "sodium": "45", "fiber": "0", "sugar": "5.0"},
        {"ingredient_id": "INVALID001", "calories": "100", "protein": "10", "fat": "10", "carbs": "10", "sodium": "10", "fiber": "10", "sugar": "10"},
    ]
    df = pd.DataFrame(data)
    df.loc[2, "sodium"] = None
    df.loc[6, "protein"] = np.nan
    return df
