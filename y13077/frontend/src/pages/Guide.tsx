import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Collapse,
  Typography,
  Space,
  Button,
  Empty,
  Spin,
  message,
  Tag
} from "antd";
import {
  FileTextOutlined,
  AlertOutlined,
  DownloadOutlined,
  BookOutlined,
  ArrowRightOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { guideApi } from "../services/api";
import { GuideItem } from "../types";

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const Guide: React.FC = () => {
  const navigate = useNavigate();
  const [quickStart, setQuickStart] = useState<string>("");
  const [faq, setFaq] = useState<Array<{ question: string; answer: string }>>([]);
  const [guideItems, setGuideItems] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGuideData();
  }, []);

  const loadGuideData = async () => {
    setLoading(true);
    try {
      const [quickStartRes, faqRes, guideRes] = await Promise.all([
        guideApi.getQuickStart(),
        guideApi.getFAQ(),
        guideApi.getGuide()
      ]);
      
      setQuickStart(quickStartRes.data.data || "");
      setFaq(faqRes.data.data || []);
      setGuideItems(guideRes.data.data || []);
    } catch (error) {
      message.error("加载指南数据失败，使用默认数据");
      setQuickStart("快速入门指南：1. 样例数据位于预审列表页面顶部的'创建样例'按钮；2. 异常在预审详情页的'异常检测'标签页中查看；3. 导出在预审详情页右上角的'导出'按钮。");
      setFaq([
        {
          question: "如何创建一个新的预审？",
          answer: "点击预审列表页面的'新建预审'按钮，填写预审名称和描述后提交即可。系统会自动创建预审并跳转到详情页。"
        },
        {
          question: "运行检测需要多长时间？",
          answer: "一般情况下，运行检测需要3-10秒，具体时间取决于CAD文件的复杂度和异常数量。检测过程中请耐心等待，不要关闭页面。"
        },
        {
          question: "如何确认一个异常？",
          answer: "在异常检测列表中，找到需要确认的异常项，点击右侧的'确认'按钮即可。确认后异常状态会变为'已确认'，并在历史记录中保留操作痕迹。"
        },
        {
          question: "导出支持哪些格式？",
          answer: "目前支持Excel(.xlsx)、PDF和CSV三种格式导出。导出内容可选择是否包含历史记录、异常详情和截图附件。"
        },
        {
          question: "视图配置有什么作用？",
          answer: "视图配置可以保存当前CAD查看器的视角、缩放比例和位置信息，方便后续快速定位到特定区域查看异常。可以在'视图配置'标签页中管理所有已保存的视图。"
        }
      ]);
      setGuideItems([
        {
          title: "样例位置",
          content: "点击预审列表页面顶部的'创建样例'按钮，系统会自动创建一个包含完整数据的预审样例，包含CAD图层、材料清单和预设异常。这是了解系统功能最快的方式。",
          type: "example",
          order: 1
        },
        {
          title: "异常定位",
          content: "进入预审详情页后，在'异常检测'标签页可以查看所有检测出的异常。点击'定位'按钮可以在CAD视图中高亮显示异常位置，点击'截图'可以保存当前视图作为证据。",
          type: "exception",
          order: 2
        },
        {
          title: "结果导出",
          content: "确认所有异常后，点击详情页右上角的'导出'按钮，选择需要的格式和导出内容，系统会自动生成报告文件并下载。导出的报告包含预审基本信息、异常列表和历史记录。",
          type: "export",
          order: 3
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const guideCardConfig = {
    example: {
      icon: <FileTextOutlined style={{ fontSize: 32, color: "#1890ff" }} />,
      color: "#1890ff",
      bgColor: "#e6f7ff"
    },
    exception: {
      icon: <AlertOutlined style={{ fontSize: 32, color: "#ff4d4f" }} />,
      color: "#ff4d4f",
      bgColor: "#fff1f0"
    },
    export: {
      icon: <DownloadOutlined style={{ fontSize: 32, color: "#52c41a" }} />,
      color: "#52c41a",
      bgColor: "#f6ffed"
    }
  };

  const quickStartPoints = quickStart.split(/[；;。.]/).filter(p => p.trim()).slice(0, 3);

  return (
    <div style={{ padding: 24 }}>
      <Spin spinning={loading}>
        <div style={{ marginBottom: 24 }}>
          <Space align="center">
            <BookOutlined style={{ fontSize: 32, color: "#1890ff" }} />
            <Title level={3} style={{ margin: 0 }}>接班指南</Title>
          </Space>
          <Text type="secondary" style={{ marginTop: 8, display: "block" }}>
            快速了解系统使用方法，高效完成冷通道预审工作
          </Text>
        </div>

        <Row gutter={24}>
          <Col span={8}>
            <Card
              title={
                <Space>
                  <BookOutlined />
                  <span>快速入门</span>
                </Space>
              }
              bordered={false}
              style={{ height: "100%" }}
            >
              {quickStartPoints.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {quickStartPoints.map((point, index) => (
                    <div key={index} style={{ display: "flex", gap: 12 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          backgroundColor: "#1890ff",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontWeight: "bold"
                        }}
                      >
                        {index + 1}
                      </div>
                      <Paragraph style={{ margin: 0, lineHeight: 1.8 }}>
                        {point.trim()}
                      </Paragraph>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="暂无快速入门内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}

              <Button
                type="primary"
                block
                style={{ marginTop: 24 }}
                onClick={() => navigate("/reviews")}
              >
                进入预审列表
                <ArrowRightOutlined />
              </Button>
            </Card>
          </Col>

          <Col span={16}>
            <Card
              title={
                <Space>
                  <AlertOutlined />
                  <span>常见问题</span>
                </Space>
              }
              bordered={false}
              style={{ height: "100%" }}
            >
              {faq.length > 0 ? (
                <Collapse accordion defaultActiveKey={["0"]}>
                  {faq.map((item, index) => (
                    <Panel
                      key={index}
                      header={
                        <Space>
                          <Tag color="blue">Q{index + 1}</Tag>
                          <Text strong>{item.question}</Text>
                        </Space>
                      }
                    >
                      <div style={{ paddingLeft: 40 }}>
                        <Paragraph style={{ margin: 0 }}>{item.answer}</Paragraph>
                      </div>
                    </Panel>
                  ))}
                </Collapse>
              ) : (
                <Empty description="暂无常见问题" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 24 }}>
          <Title level={4} style={{ marginBottom: 16 }}>操作指南</Title>
          <Row gutter={[16, 16]}>
            {guideItems
              .sort((a, b) => a.order - b.order)
              .map(item => {
                const config = guideCardConfig[item.type];
                return (
                  <Col span={8} key={item.order}>
                    <Card
                      hoverable
                      bordered={false}
                      style={{
                        height: "100%",
                        backgroundColor: config.bgColor,
                        borderTop: `4px solid ${config.color}`
                      }}
                      bodyStyle={{ padding: 24 }}
                    >
                      <div style={{ marginBottom: 16 }}>{config.icon}</div>
                      <Title level={5} style={{ color: config.color, marginBottom: 12 }}>
                        {item.title}
                      </Title>
                      <Paragraph style={{ marginBottom: 0, lineHeight: 1.8 }}>
                        {item.content}
                      </Paragraph>

                      <Button
                        type="link"
                        style={{
                          padding: 0,
                          marginTop: 16,
                          color: config.color
                        }}
                        onClick={() => {
                          if (item.type === "example") {
                            navigate("/reviews");
                          } else {
                            message.info("请先进入预审详情页");
                            navigate("/reviews");
                          }
                        }}
                      >
                        查看详情 <ArrowRightOutlined />
                      </Button>
                    </Card>
                  </Col>
                );
              })}
          </Row>
        </div>

        <Card
          style={{ marginTop: 24 }}
          bordered={false}
          bodyStyle={{ padding: "24px 32px" }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
                还有其他问题？
              </Title>
              <Text type="secondary">
                如需更多帮助，请联系系统管理员或查阅完整的用户手册
              </Text>
            </Col>
            <Col>
              <Space>
                <Button size="large" onClick={() => navigate("/reviews")}>
                  返回列表
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => message.info("用户手册功能开发中")}
                >
                  查看完整手册
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </Spin>
    </div>
  );
};

export default Guide;
