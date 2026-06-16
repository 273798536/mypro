import type { ComplaintRecord, ComplaintSource } from "../types";
import { generateFingerprint } from "../utils/fingerprint";

const now = new Date();
const iso = (offsetHours: number, offsetMin = 0) => {
  const d = new Date(now.getTime() - offsetHours * 3600000 - offsetMin * 60000);
  return d.toISOString();
};

const fmt = (isoStr: string) => {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
};

export interface MockInput {
  id: string;
  title: string;
  description: string;
  location_name: string;
  lat: number;
  lng: number;
  intersection: string;
  reporter: string;
  report_time: string;
  complaint_source: ComplaintSource;
  photo_url: string;
  original_row_ref: string;
}

export const mockBatch1: MockInput[] = [
  {
    id: "tmp-001",
    title: "中山公园南门广场舞噪音扰民",
    description: "晚上19:30-21:00在南门广场跳广场舞，音响声音特别大，旁边居民楼5楼都听得清清楚楚，小孩没法写作业。",
    location_name: "中山公园南门广场",
    lat: 31.2304,
    lng: 121.4737,
    intersection: "南京西路与黄陂北路交叉口东南角",
    reporter: "李阿姨",
    report_time: fmt(iso(26, 15)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E4%B8%AD%E5%B1%B1%E5%85%AC%E5%9B%AD%E5%8D%97%E9%97%A8%E5%B9%BF%E5%9C%BA%E5%A4%9C%E6%99%9A%E5%B9%BF%E5%9C%BA%E8%88%9E%E7%8E%B0%E5%9C%BA%E5%9B%BE%E7%89%87%EF%BC%8C%E5%A4%9A%E5%90%8D%E4%B8%AD%E5%B9%B4%E5%A5%B3%E6%80%A7%E5%9C%A8%E8%B7%B3%E8%88%9E%EF%BC%8C%E5%86%85%E5%A4%96%E6%9C%89%E9%9F%B3%E5%93%8D%E8%AE%BE%E5%A4%87%EF%BC%8C%E7%8E%AF%E5%A2%83%E7%81%AF%E5%85%89%E6%9F%94%E5%92%8C&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第3行_对象ID:IMG_4821",
  },
  {
    id: "tmp-002",
    title: "中山公园东门卡拉OK噪声",
    description: "东门亭子下面有人每天下午用大音响唱卡拉OK，15:00到17:30一直放，声音开得很大，和南门广场舞差不多。",
    location_name: "中山公园东门亭子",
    lat: 31.2318,
    lng: 121.4752,
    intersection: "南京西路与石门一路交叉口西南角",
    reporter: "王师傅",
    report_time: fmt(iso(26, 45)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E4%B8%AD%E5%B1%B1%E5%85%AC%E5%9B%AD%E4%B8%9C%E9%97%A8%E4%BA%AD%E5%AD%90%E4%B8%8B%E5%8D%A1%E6%8B%89OK%E7%8E%B0%E5%9C%BA%EF%BC%8C%E4%B8%AD%E5%B9%B4%E7%94%B7%E5%A5%B3%E5%9B%B4%E5%9D%90%E8%80%8C%E6%AD%8C%E5%94%B1%EF%BC%8C%E5%BA%AD%E5%AD%90%E9%87%8C%E6%91%86%E6%94%BE%E9%9F%B3%E5%93%8D%E8%AE%BE%E5%A4%87%E5%92%8C%E9%BA%A6%E5%85%8B%E9%A3%8E&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第4行_对象ID:IMG_4825",
  },
  {
    id: "tmp-003",
    title: "和平公园3号门儿童乐园嘈杂",
    description: "周末上午小朋友太多，加上旁边有萨克斯练习声，综合噪声让人不舒服。家里老人来遛弯说心脏受不了。",
    location_name: "和平公园3号门儿童乐园",
    lat: 31.2589,
    lng: 121.4998,
    intersection: "大连路与新港路交叉口东北角",
    reporter: "张女士",
    report_time: fmt(iso(25, 10)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E5%92%8C%E5%B9%B3%E5%85%AC%E5%9B%AD%E5%84%BF%E7%AB%A5%E4%B9%90%E5%9B%AD%E5%91%A8%E6%9C%AB%E7%83%AD%E9%97%B9%E7%8E%B0%E5%9C%BA%EF%BC%8C%E8%AE%B8%E5%A4%9A%E5%AE%B6%E9%95%BF%E5%B8%A6%E5%B0%8F%E5%AD%A9%E5%9C%A8%E7%8E%A9%E8%BF%90%E5%8A%A8%E5%99%A8%E6%9D%90%EF%BC%8C%E6%97%81%E8%BE%B9%E6%9C%89%E4%B8%AD%E5%B9%B4%E4%BA%BA%E5%9C%A8%E5%A5%8F%E8%90%A8%E5%85%8B%E6%96%AF&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第7行_对象ID:IMG_4831",
  },
  {
    id: "tmp-004",
    title: "中山公园南门广场舞-邻路口合错A",
    description: "晚上19:40在南门东侧空地上，阿姨们跳广场舞声音很大，和南门广场是同一个点位的不同说法。",
    location_name: "中山公园南门广场",
    lat: 31.2306,
    lng: 121.4739,
    intersection: "南京西路与黄陂北路交叉口东南角",
    reporter: "刘奶奶",
    report_time: fmt(iso(25, 50)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E4%B8%AD%E5%B1%B1%E5%85%AC%E5%9B%AD%E5%8D%97%E9%97%A8%E5%B9%BF%E5%9C%BA%E5%A4%9C%E6%99%9A%E5%B9%BF%E5%9C%BA%E8%88%9E%E8%BF%91%E6%99%AF%EF%BC%8C%E5%8D%81%E4%BD%99%E5%90%8D%E5%A4%A7%E5%A7%90%E5%9C%A8%E9%9F%B3%E4%B9%90%E4%B8%8B%E8%B7%B3%E8%88%9E%EF%BC%8C%E9%99%84%E8%BF%91%E6%A0%91%E6%9C%A8%E7%81%AF%E5%85%89&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第9行_对象ID:IMG_4837",
  },
  {
    id: "tmp-005",
    title: "中山公园南门广场舞-邻路口合错B",
    description: "夜间在南门附近广场，声音扰民。现场看到音响和统一服装队伍，与黄陂北路角上的是同一批。",
    location_name: "中山公园南门广场",
    lat: 31.2305,
    lng: 121.4736,
    intersection: "南京西路与黄陂南路交叉口东南角",
    reporter: "陈先生",
    report_time: fmt(iso(25, 55)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E5%85%AC%E5%9B%AD%E5%8D%97%E9%97%A8%E5%A4%9C%E9%97%B4%E8%A1%97%E9%81%93%E6%8B%8D%E6%91%84%EF%BC%8C%E8%BF%9C%E6%9C%9B%E8%A7%81%E5%B9%BF%E5%9C%BA%E4%B8%8A%E8%B7%B3%E8%88%9E%E7%9A%84%E4%BA%BA%E7%BE%A4%E5%92%8C%E9%9F%B3%E5%93%8D%EF%BC%8C%E7%81%AF%E5%85%89%E6%9F%94%E5%92%8C%E6%99%95%E6%98%A0%E5%9C%B0%E9%9D%A2&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第10行_对象ID:IMG_4839",
  },
  {
    id: "tmp-006",
    title: "坏数据：坐标异常-世纪公园噪声投诉",
    description: "公园内有晨练音乐",
    location_name: "世纪公园",
    lat: 99.999,
    lng: 888.888,
    intersection: "",
    reporter: "赵先生",
    report_time: fmt(iso(24, 30)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E4%B8%96%E7%BA%AA%E5%85%AC%E5%9B%AD%E6%99%A8%E7%BB%83%E5%9C%BA%E9%9D%A2%E5%B9%BF%E8%A7%92%E6%8B%8D%E6%91%84%EF%BC%8C%E6%A0%91%E6%9E%97%E9%97%B4%E6%9C%89%E4%BA%BA%E7%BB%83%E5%A4%AA%E6%9E%81%E5%85%AD%E5%90%88%E5%86%B2%E5%8D%8E%E6%AD%A5%EF%BC%8C%E6%97%A9%E6%99%9F%E6%B8%85%E6%96%B0%EF%BC%8C%E5%A4%AA%E9%98%B3%E5%88%9D%E5%8D%87&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第12行_对象ID:IMG_4842",
  },
  {
    id: "tmp-007",
    title: "坏数据：描述过短-公园吵闹",
    description: "吵",
    location_name: "人民公园2号门",
    lat: 31.2345,
    lng: 121.4701,
    intersection: "九江路与西藏中路交界",
    reporter: "",
    report_time: fmt(iso(24, 10)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E4%BA%BA%E6%B0%91%E5%85%AC%E5%9B%AD%E5%85%A5%E5%8F%A3%E5%A4%96%E6%8B%8D%E6%91%84%EF%BC%8C%E9%97%A8%E5%8F%A3%E6%9C%89%E6%A0%87%E5%BF%97%E7%89%8C%EF%BC%8C%E8%BF%9B%E5%87%BA%E4%BA%BA%E5%91%98%E7%A8%80%E7%A8%80%E6%8B%89%E6%8B%89%EF%BC%8C%E5%91%A8%E8%BE%B9%E5%95%86%E5%BA%97%E7%85%A7%E7%89%87&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第14行_对象ID:IMG_4846",
  },
  {
    id: "tmp-008",
    title: "鲁迅公园北侧健身区喇叭声",
    description: "每天早上6:30开始就有人用便携喇叭放广播体操音乐，声音很大，住在附近的上班族周末想睡个懒觉都不行。",
    location_name: "鲁迅公园北侧健身区",
    lat: 31.2758,
    lng: 121.4689,
    intersection: "四川北路与甜爱支路交叉口",
    reporter: "孙小姐",
    report_time: fmt(iso(23, 20)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E9%B2%81%E8%BF%85%E5%85%AC%E5%9B%AD%E5%81%A5%E8%BA%AB%E5%8C%BA%E6%99%A8%E7%BB%83%E7%8E%B0%E5%9C%BA%EF%BC%8C%E5%80%81%E4%BA%BA%E4%BB%AC%E5%9C%A8%E5%81%9A%E5%B9%BF%E6%92%AD%E4%BD%93%E6%93%8D%EF%BC%8C%E4%B8%AD%E9%97%B4%E6%94%BE%E7%9D%80%E4%BE%BF%E6%90%BA%E5%BC%8F%E9%9F%B3%E5%93%8D%E5%96%87%E5%8F%AD%EF%BC%8C%E5%91%A8%E5%9B%B4%E7%8E%AF%E5%A2%83%E6%95%B4%E6%B4%81&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第17行_对象ID:IMG_4852",
  },
  {
    id: "tmp-009",
    title: "复兴公园梧桐树下乐队排练",
    description: "每周三下午在梧桐广场，一支老年乐队排练，鼓声和小号声混在一起，虽然是业余的但音量没控制好。",
    location_name: "复兴公园梧桐广场",
    lat: 31.2147,
    lng: 121.4632,
    intersection: "皋兰路与思南路交叉口",
    reporter: "周先生",
    report_time: fmt(iso(22, 40)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E5%A4%8D%E5%85%B4%E5%85%AC%E5%9B%AD%E6%A2%A7%E6%A1%90%E6%A0%91%E4%B8%8B%E4%B9%90%E9%98%9F%E6%8E%92%E7%BB%83%EF%BC%8C%E5%87%A0%E4%BD%8D%E8%80%81%E5%B9%B4%E4%B9%90%E6%89%8B%E5%9C%A8%E6%BC%94%E5%A5%8F%E5%B0%8F%E5%8F%B7%E9%AA%92%E9%BC%93%E7%AD%89%E4%B9%90%E5%99%A8%EF%BC%8C%E6%A0%91%E8%8D%89%E8%8C%82%E7%9B%9B%EF%BC%8C%E9%98%B3%E5%85%89%E9%80%8F%E4%B8%8B&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第19行_对象ID:IMG_4857",
  },
  {
    id: "tmp-010",
    title: "延平路绿地狗狗吠叫",
    description: "傍晚遛狗的人集中，几只大型犬互相叫，声音穿透力很强，旁边就是居民楼低层。",
    location_name: "延平路公共绿地",
    lat: 31.2397,
    lng: 121.4487,
    intersection: "延平路与武定路交叉口",
    reporter: "林女士",
    report_time: fmt(iso(21, 5)),
    complaint_source: "巡检照片",
    photo_url:
      "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E5%BB%B6%E5%B9%B3%E8%B7%AF%E5%85%AC%E5%85%B1%E7%BB%BF%E5%9C%B0%E5%80%8D%E6%99%9A%E9%81%9D%E7%8B%97%E5%9C%BA%E6%99%AF%EF%BC%8C%E5%87%A0%E5%8F%AA%E5%A4%A7%E5%9E%8B%E7%8A%AC%E5%9C%A8%E8%BF%BD%E9%80%90%E5%96%9A%E5%8F%AB%EF%BC%8C%E7%8A%AC%E4%B8%BB%E4%BA%BA%E5%9C%A8%E6%97%81%E8%BE%B9%E8%81%8A%E5%A4%A9%EF%BC%8C%E5%A4%9C%E6%9A%AE%E9%99%8D%E4%B8%B4&image_size=landscape_4_3",
    original_row_ref: "巡检照片导出表_20260615_第22行_对象ID:IMG_4861",
  },
];

export const mockBatch2_manualNormal: MockInput = {
  id: "tmp-manual-001",
  title: "徐家汇公园长廊口琴演奏",
  description: "下午15:00左右在汇金湖长廊，几位退休老师用口琴齐奏红歌，虽然吹奏水平不错但声音没控制，沿长廊100米都能听清。",
  location_name: "徐家汇公园汇金湖长廊",
  lat: 31.1956,
  lng: 121.4367,
  intersection: "肇嘉浜路与天平路交叉口西北侧",
  reporter: "吴阿姨",
  report_time: fmt(iso(5, 30)),
  complaint_source: "手动补录",
  photo_url:
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=%E5%BE%90%E5%AE%B6%E6%B1%87%E5%85%AC%E5%9B%AD%E9%95%BF%E5%BB%8A%E5%8F%A3%E7%90%B4%E6%BC%94%E5%A5%8F%E7%8E%B0%E5%9C%BA%EF%BC%8C%E5%87%A0%E4%BD%8D%E6%88%B4%E7%9C%BC%E9%95%9C%E7%9A%84%E9%80%80%E4%BC%91%E8%80%81%E5%B8%88%E5%9C%A8%E5%9B%B4%E5%9D%90%E6%BC%94%E5%A5%8F%E5%8F%A3%E7%90%B4%EF%BC%8C%E9%95%BF%E5%BB%8A%E7%8E%AF%E7%8E%AF%E5%80%92%E6%98%A0%E6%B9%96%E9%9D%A2&image_size=landscape_4_3",
  original_row_ref: "手动补录-街道周姐-20260616上午核实材料",
};

export function buildComplaintRecords(
  inputs: MockInput[],
  batchId: string
): ComplaintRecord[] {
  const createdAt = new Date().toISOString();
  return inputs.map((m) => {
    const partial: Partial<ComplaintRecord> = {
      reporter: m.reporter,
      report_time: m.report_time,
      location_name: m.location_name,
      description: m.description,
    };
    return {
      id: m.id.replace("tmp-", batchId + "-"),
      fingerprint: generateFingerprint(partial),
      title: m.title,
      description: m.description,
      location_name: m.location_name,
      lat: m.lat,
      lng: m.lng,
      intersection: m.intersection,
      reporter: m.reporter,
      report_time: m.report_time,
      complaint_source: m.complaint_source,
      photo_url: m.photo_url,
      source_batch_id: batchId,
      status: "normal",
      is_intersection_error: false,
      original_row_ref: m.original_row_ref,
      created_at: createdAt,
      updated_at: createdAt,
    };
  });
}
