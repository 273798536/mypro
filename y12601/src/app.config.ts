export default defineAppConfig({
  pages: [
    'pages/practice/index',
    'pages/drafts/index',
    'pages/mine/index',
    'pages/staining/index',
    'pages/result/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#6B4C9A',
    navigationBarTitleText: '细胞切片涂色练习',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#6B4C9A',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/practice/index',
        text: '练习',
      },
      {
        pagePath: 'pages/drafts/index',
        text: '草稿',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
      },
    ],
  },
})
