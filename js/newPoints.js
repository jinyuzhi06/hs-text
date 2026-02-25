// 2026年新增红色景点坐标（高德坐标系 GCJ-02）
// image: 单张图片时使用，值为图片路径字符串
// images: 多张图片时使用，值为图片路径数组
const newPoints = [
  // --- 测试：多张图片轮播 ---
  {
    lat: 39.915,
    lng: 116.404,
    title: "测试轮播景点",
    location: "黑龙江",
    images: [
      "img/731.png",
      "img/918.png",
      "img/嘉兴南湖.png",
      "img/遵义会议.png",
    ],
    content:
      "这是一个用于测试多图轮播效果的景点，包含4张图片，可以左右切换查看。",
  },
].sort((a, b) => a.title.localeCompare(b.title));

export { newPoints };
