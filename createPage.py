from tool import createPage
import argparse

parser = argparse.ArgumentParser(description='创建页面')

parser.add_argument('u', help='URL目录')
parser.add_argument('n', help='标题')


args = parser.parse_args()

createPage(args.u, args.n)
