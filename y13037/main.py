"""顶层入口：python main.py [命令] 等价于 python -m hk_tax_recon.cli [命令]"""
from hk_tax_recon.cli import cli

if __name__ == "__main__":
    cli()
