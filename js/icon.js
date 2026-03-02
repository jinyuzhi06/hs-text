const userIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png", // 默认图标
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const pathPointIcon = L.icon({
  iconUrl: "https://cdn.luogu.com.cn/upload/image_hosting/ulvs2stg.png", // 自定义图标
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// 新增景点图标（红色五角星）
const newPointIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2Ij4KICA8cGF0aCBkPSJNMTIgMiBDIDguMSA2IDUgMTAgNSAxNCBDIDUgMTguIDguMiAyMiAxMiAyMiBDIDE1LjggMjIgMTkgMTguIDE5IDE0IEMgMTkgMTAgMTUuOSA2IDEyIDIgWiIgZmlsbD0iI2QzMjkzMyIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8cGF0aCBkPSJNMTIgOC41IEwgMTMuMiAxMS44IEwgMTYuNyAxMi4xIEwgMTQuMSAxNC40IEwgMTQuOSAxNy44IEwgMTIgMTYuMSBMIDkuMSAxNy44IEwgOS45IDE0LjQgTCA3LjMgMTIuMSBMIDEwLjggMTEuOCBaIiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPg==",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

export { userIcon, pathPointIcon, newPointIcon };
