#!/usr/bin/env python3
"""银行流水凭证匹配CLI工具 - 入口文件"""

from voucher_matcher.cli import VoucherMatcherCLI


def main():
    app = VoucherMatcherCLI()
    app.run()


if __name__ == "__main__":
    main()
