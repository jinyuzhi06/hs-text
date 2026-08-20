import { map } from "./map.js";
import { pathPointIcon } from "./icon.js";
import { pathPoints } from "./pathPoints.js";
import { newPoints } from "./newPoints.js";
import { searchRedSitesNow } from "./redSites.js"; // 引入红色景点搜索功能

// 创建全局markers对象用于存储所有标记
window.markersMap = {};

// 根据坐标打开弹窗的函数
window.openPopupByCoords = function (lat, lng) {
  const key = `${lat},${lng}`;
  if (window.markersMap[key]) {
    window.markersMap[key].openPopup();
  }
};

function setMapHeight() {
  let mapDom = document.getElementById("map");
  mapDom.style.height = window.innerHeight + "px";
}

setMapHeight();

window.addEventListener("resize", setMapHeight);
window.addEventListener("orientationchange", setMapHeight);

map.setView([INITIAL_LAT, INITIAL_LNG], DEFAULT_ZOOM);

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

// 根据设备类型决定是否显示经纬度
document.getElementById("coordinate-display").style.display = isMobile()
  ? "none"
  : "block";

// pathPoints 存储的是 WGS-84 坐标，newPoints 存储的是 GCJ-02 坐标
const displayPoints = pathPoints;

// 将 newPoints 的 GCJ-02 坐标预转换为 WGS-84，存为 _lat/_lng 供地图使用
const convertor = L.coordConvertor();
const newPointsConverted = newPoints.map((p) => {
  const wgs = convertor.gcj02_To_gps84(p.lng, p.lat);
  return { ...p, _lat: wgs.lat, _lng: wgs.lng, isNew: true };
});
const allPoints = [
  ...pathPoints.map((p) => ({ ...p, _lat: p.lat, _lng: p.lng })),
  ...newPointsConverted,
];

// 全局轮播计数器，用于给每个弹窗轮播图分配唯一ID
let popupCarouselCounter = 0;

/**
 * 生成弹窗内容 HTML
 * - 单张图片（image 字段）：直接显示图片
 * - 多张图片（images 数组）：显示轮播图
 */
function buildPopupContent(point) {
  const title = `<b>${point.title}</b><br>`;
  const desc = `<p class="site-intro">${point.content || "这是" + point.title}</p><br>`;

  // 多张图片 → 轮播图
  if (point.images && point.images.length > 1) {
    const cid = `pc-${popupCarouselCounter++}`;
    const slides = point.images
      .map(
        (src) =>
          `<div class="popup-carousel-slide"><img src="${src}" alt="${point.title}" onerror="this.onerror=null;this.src='img/mark1.png';" /></div>`,
      )
      .join("");
    const dots = point.images
      .map(
        (_, i) =>
          `<button class="popup-carousel-dot${i === 0 ? " active" : ""}" data-cid="${cid}" data-index="${i}"></button>`,
      )
      .join("");

    const carousel = `
      <div class="popup-carousel" data-cid="${cid}" data-total="${point.images.length}" data-current="0">
        <div class="popup-carousel-track" style="transform:translateX(0%)">
          ${slides}
        </div>
        <button class="popup-carousel-btn popup-carousel-prev" data-cid="${cid}">‹</button>
        <button class="popup-carousel-btn popup-carousel-next" data-cid="${cid}">›</button>
      </div>
      <div class="popup-carousel-dots">${dots}</div>
      <div class="popup-carousel-counter" data-cid="${cid}">1 / ${point.images.length}</div>
    `;
    return title + carousel + desc;
  }

  // 单张图片（images 只含1张时也走这里）
  const imgSrc =
    point.image || (point.images && point.images[0]) || "img/mark1.png";
  return `${title}<img src="${imgSrc}" alt="${point.title}" style="width:100%;" onerror="this.onerror=null;this.src='img/mark1.png';"><br>${desc}`;
}

/**
 * 弹窗轮播图：滑动到第 index 张
 */
function popupCarouselGoTo(cid, index) {
  const container = document.querySelector(
    `.popup-carousel[data-cid="${cid}"]`,
  );
  if (!container) return;
  const total = parseInt(container.dataset.total);
  if (index < 0) index = total - 1;
  if (index >= total) index = 0;
  container.dataset.current = index;

  const track = container.querySelector(".popup-carousel-track");
  track.style.transform = `translateX(-${index * 100}%)`;

  // 更新 dots
  document
    .querySelectorAll(`.popup-carousel-dot[data-cid="${cid}"]`)
    .forEach((dot) => {
      dot.classList.toggle("active", parseInt(dot.dataset.index) === index);
    });

  // 更新计数器
  const counter = document.querySelector(
    `.popup-carousel-counter[data-cid="${cid}"]`,
  );
  if (counter) counter.textContent = `${index + 1} / ${total}`;
}

// 使用事件委托在 document 级别监听轮播图按钮的点击（避免 Leaflet 弹窗事件干扰）
document.addEventListener(
  "click",
  function (e) {
    // 左右箭头
    const prevBtn = e.target.closest(".popup-carousel-prev");
    if (prevBtn) {
      e.stopPropagation();
      const cid = prevBtn.dataset.cid;
      const container = document.querySelector(
        `.popup-carousel[data-cid="${cid}"]`,
      );
      if (container)
        popupCarouselGoTo(cid, parseInt(container.dataset.current) - 1);
      return;
    }
    const nextBtn = e.target.closest(".popup-carousel-next");
    if (nextBtn) {
      e.stopPropagation();
      const cid = nextBtn.dataset.cid;
      const container = document.querySelector(
        `.popup-carousel[data-cid="${cid}"]`,
      );
      if (container)
        popupCarouselGoTo(cid, parseInt(container.dataset.current) + 1);
      return;
    }
    // dot 点击
    const dot = e.target.closest(".popup-carousel-dot");
    if (dot) {
      e.stopPropagation();
      popupCarouselGoTo(dot.dataset.cid, parseInt(dot.dataset.index));
      return;
    }
  },
  true,
); // 使用捕获阶段，确保在 Leaflet 阻止冒泡之前拦截

// 添加标记点（使用预转换后的 _lat/_lng）
function addPointMarkers(points) {
  points.forEach(function (point) {
    const lat = point._lat;
    const lng = point._lng;
    let marker = L.marker([lat, lng], {
      icon: pathPointIcon,
    }).addTo(map);
    let popupContent = buildPopupContent(point);
    marker
      .bindPopup(popupContent, {
        maxWidth: Math.min(300, window.innerWidth - 100),
        maxHeight: window.innerHeight - 200,
        autoPanPadding: [50, 100],
      })
      .openPopup()
      .closePopup();
    marker.on("click", function () {
      map.setView([lat, lng], map.getZoom(), {
        animate: true,
        duration: 0.5,
      });
      marker.openPopup();
    });

    // 存储marker到全局对象
    const key = `${lat},${lng}`;
    window.markersMap[key] = marker;
  });
}

addPointMarkers(allPoints);

map.setView([INITIAL_LAT, INITIAL_LNG], 5);
let nav = document.querySelector("#location-nav");

let province = [];
for (let i = 0; i < allPoints.length; i++) {
  if (!province.includes(allPoints[i].location)) {
    province.push(allPoints[i].location);
  }
}
province.sort((a, b) => a.localeCompare(b));

// 将默认省份设置为福建
const defaultProvince = "福建";
const defaultIndex = province.indexOf(defaultProvince);
if (defaultIndex > -1) {
  province.splice(defaultIndex, 1);
  province.unshift(defaultProvince);
}

updateSidebar(allPoints.filter((point) => point.location === province[0]));
console.log(province);
nav.innerHTML = province
  .map(
    (p) => `
    <option value="${p}">${p}</option>
`,
  )
  .join("");

nav.onchange = function () {
  updateSidebar(allPoints.filter((point) => point.location === this.value));
};

function updateSidebar(points) {
  let sidebarList = document.getElementById("sidebar-list");
  sidebarList.innerHTML = points
    .map(
      (point) => `
        <li data-lat="${point._lat}" data-lng="${point._lng}">
            ${point.title}${point.isNew ? " (2026寒假) <span style='color: gold;'>★</span>" : ""}
        </li>
    `,
    )
    .join("");

  sidebarList.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", function () {
      let lat = parseFloat(this.getAttribute("data-lat"));
      let lng = parseFloat(this.getAttribute("data-lng"));
      map.closePopup();
      map.setView([lat, lng], DEFAULT_ZOOM, {
        animate: true,
        duration: 0.5,
      });
      // 等动画结束后再打开弹窗，避免 autoPan 导致不居中
      map.once("moveend", function () {
        openPopupByCoords(lat, lng);
      });
    });
  });
}

document
  .getElementById("sidebar-toggle")
  .addEventListener("click", function () {
    let sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("open");
  });

const redSitesRefresh = document.getElementById("red-sites-refresh");
if (redSitesRefresh) {
  redSitesRefresh.addEventListener("click", () => {
    searchRedSitesNow();
  });
}

// ============ 轮播图功能 ============
class Carousel {
  constructor() {
    this.currentIndex = 0;
    this.carouselData = [];
    this.toggleBtn = document.getElementById("carousel-toggle");
    this.content = document.getElementById("carousel-content");
    this.track = document.getElementById("carousel-track");
    this.dotsContainer = document.getElementById("carousel-dots");
    this.prevBtn = document.getElementById("carousel-prev");
    this.nextBtn = document.getElementById("carousel-next");
    this.autoPlayTimer = null;
    this.compactTimer = null;

    this.initEventListeners();
    this.initCarousel();
  }

  initEventListeners() {
    // 展开/收起按钮
    this.toggleBtn.addEventListener("click", () => {
      this.clearCompactTimer();
      this.toggleBtn.classList.remove("compact");
      this.toggleContent();
    });

    // 按钮hover时清除计时器
    this.toggleBtn.addEventListener("mouseenter", () => {
      this.clearCompactTimer();
      this.toggleBtn.classList.remove("compact");
      // 恢复文字
      if (this.content.style.display === "none") {
        this.toggleBtn.textContent = "▼展示图片";
      }
    });

    // 按钮离开时重新启动计时器
    this.toggleBtn.addEventListener("mouseleave", () => {
      if (this.content.style.display === "none") {
        this.startCompactTimer();
      }
    });

    // 左右箭头按钮
    this.prevBtn.addEventListener("click", () => {
      this.previousSlide();
    });

    this.nextBtn.addEventListener("click", () => {
      this.nextSlide();
    });

    // 绑定标题点击事件（事件委托）
    this.bindTitleClickEvents();
  }

  toggleContent() {
    if (this.content.style.display === "none") {
      this.content.style.display = "block";
      this.toggleBtn.textContent = "▲收起图片";
      this.clearCompactTimer();
      this.toggleBtn.classList.remove("compact");
      this.startAutoPlay();
    } else {
      this.content.style.display = "none";
      this.toggleBtn.textContent = "▼展示图片";
      this.toggleBtn.classList.remove("compact");
      this.startCompactTimer();
      this.stopAutoPlay();
    }
  }

  startCompactTimer() {
    this.clearCompactTimer();
    this.compactTimer = setTimeout(() => {
      if (this.content.style.display === "none") {
        this.toggleBtn.classList.add("compact");
        this.toggleBtn.textContent = "▼";
      }
    }, 2000);
  }

  clearCompactTimer() {
    if (this.compactTimer) {
      clearTimeout(this.compactTimer);
      this.compactTimer = null;
    }
  }

  // 获取随机的4个景点（仅从 newPoints 中取，使用已转换坐标的版本）
  getRandomPoints(num = 4) {
    if (newPointsConverted.length === 0) return [];

    const shuffled = [...newPointsConverted].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(num, newPointsConverted.length));
  }

  // 更新轮播图数据
  updateCarousel() {
    this.carouselData = this.getRandomPoints(4);
    this.currentIndex = 0;
    this.renderSlides();
    this.renderDots();
    this.showSlide(0);
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  // 渲染幻灯片
  renderSlides() {
    this.track.innerHTML = this.carouselData
      .map((point, index) => {
        const imgSrc =
          point.image || (point.images && point.images[0]) || "img/mark1.png";
        return `
            <div class="carousel-slide ${index === 0 ? "active" : ""}">
                <img src="${imgSrc}" alt="${point.title}" class="carousel-image" onerror="this.onerror=null;this.src='img/mark1.png';" />
                <div class="carousel-title" data-lat="${point._lat}" data-lng="${point._lng}">${point.title}</div>
            </div>
          `;
      })
      .join("");

    // 为所有标题添加鼠标事件
    this.addTitleHoverEvents();
  }

  // 添加标题的hover事件
  addTitleHoverEvents() {
    this.track.querySelectorAll(".carousel-title").forEach((title) => {
      title.addEventListener("mouseenter", () => {
        title.classList.add("hover");
      });
      title.addEventListener("mouseleave", () => {
        title.classList.remove("hover");
      });
    });
  }

  // 绑定标题点击事件（在track上使用事件委托）
  bindTitleClickEvents() {
    this.track.removeEventListener("click", this.handleTitleClick);
    this.handleTitleClick = (e) => {
      const title = e.target.closest(".carousel-title");
      if (title) {
        const lat = parseFloat(title.getAttribute("data-lat"));
        const lng = parseFloat(title.getAttribute("data-lng"));
        map.closePopup();
        map.setView([lat, lng], DEFAULT_ZOOM, {
          animate: true,
          duration: 0.5,
        });
        // 等动画结束后再打开弹窗，避免 autoPan 导致不居中
        map.once("moveend", function () {
          openPopupByCoords(lat, lng);
        });
      }
    };
    this.track.addEventListener("click", this.handleTitleClick);
  }

  // 渲染点指示器
  renderDots() {
    this.dotsContainer.innerHTML = this.carouselData
      .map(
        (_, index) => `
            <div class="carousel-dot ${index === 0 ? "active" : ""}" data-index="${index}"></div>
        `,
      )
      .join("");

    // 给每个点添加点击事件
    this.dotsContainer.querySelectorAll(".carousel-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        const index = parseInt(dot.getAttribute("data-index"));
        this.goToSlide(index);
      });
    });
  }

  // 显示指定幻灯片
  showSlide(index) {
    if (this.carouselData.length === 0) return;

    const slides = this.track.querySelectorAll(".carousel-slide");
    slides.forEach((slide) => slide.classList.remove("active"));
    slides[index].classList.add("active");

    // 更新点指示器
    const dots = this.dotsContainer.querySelectorAll(".carousel-dot");
    dots.forEach((dot) => dot.classList.remove("active"));
    if (dots[index]) {
      dots[index].classList.add("active");
    }
  }

  // 跳转到指定幻灯片（用于点击点时调用）
  goToSlide(index) {
    this.currentIndex = index;
    this.showSlide(index);
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  // 上一个幻灯片
  previousSlide() {
    if (this.carouselData.length === 0) return;

    this.currentIndex =
      (this.currentIndex - 1 + this.carouselData.length) %
      this.carouselData.length;
    this.showSlide(this.currentIndex);
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  // 下一个幻灯片
  nextSlide() {
    if (this.carouselData.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.carouselData.length;
    this.showSlide(this.currentIndex);
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  // 启动自动轮播（3秒切换一次）
  startAutoPlay() {
    this.stopAutoPlay(); // 清除旧定时器
    this.autoPlayTimer = setInterval(() => {
      this.nextSlide();
    }, 3000);
  }

  // 停止自动轮播
  stopAutoPlay() {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  // 初始化轮播图
  initCarousel() {
    // 检测是否为移动设备
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    if (isMobile && this.content.style.display !== "none") {
      // 手机端默认关闭轮播图
      this.content.style.display = "none";
      this.toggleBtn.textContent = "▼展示图片";
      this.toggleBtn.classList.remove("compact");
      this.startCompactTimer();
    }

    this.updateCarousel();
  }
}

const carousel = new Carousel();

// allPoints全部挂载到window全局
window.mapInstance = map;
window.allPoints = allPoints;
document.dispatchEvent(new CustomEvent('mapReady',{
  detail:{
    mapObj: map
  }
}));
console.log("✅全局挂载完成，allPoints长度：", allPoints.length);
