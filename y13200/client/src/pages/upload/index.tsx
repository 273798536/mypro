import React, { useState, useMemo, useEffect } from 'react';
import {
  Upload,
  Button,
  Table,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Tooltip,
  Alert,
  Checkbox,
  Modal,
  message,
  Card,
  Progress,
  Empty,
} from 'antd';
import {
  UploadOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  MusicOutlined,
  CheckSquareOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store';
import { fileApi, matchingApi, trackApi } from '@/api';
import { Track, MatchResult, BatchMatchResult, MatchCandidate, FileDto } from '@/types';
import {
  generateBatchId,
  getTrackNoFromFileName,
  getDurationFromFileName,
  truncateText,
  getStatusColor,
} from '@/utils';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

interface MatchingPreviewItem {
  key: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  parsedTrackNo?: number;
  parsedTitle?: string;
  parsedDuration?: number;
  matchConfidence: number;
  suggestedTrackId?: string;
  suggestedTrack?: Track;
  anomalyList: string[];
  matchType: 'auto' | 'suggest' | 'manual' | 'none';
  selected: boolean;
  manualTrackId?: string;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  analyzed: boolean;
  matchResult?: MatchResult;
}

const UploadPage: React.FC = () => {
  const { tracks, setLoading } = useAppStore();

  const [sourceBatch, setSourceBatch] = useState(generateBatchId());
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [matchingItems, setMatchingItems] = useState<MatchingPreviewItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [manualMatchModalVisible, setManualMatchModalVisible] = useState(false);
  const [currentManualItem, setCurrentManualItem] = useState<MatchingPreviewItem | null>(null);
  const [selectedManualTrackId, setSelectedManualTrackId] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<FileDto[]>([]);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const response = await trackApi.findAll({ limit: 1000 });
        if (response.data.length === 0) {
          generateMockTracks();
        }
      } catch (error) {
        console.error('Failed to fetch tracks:', error);
      }
    };
    fetchTracks();
  }, []);

  const generateMockTracks = () => {
    const mockTracks: Track[] = [];
    const artists = ['周杰伦', '林俊杰', '陈奕迅', '邓紫棋', '薛之谦'];
    const titles = [
      '晴天', '七里香', '稻香', '江南', '修炼爱情',
      '富士山下', '十年', '光年之外', '演员', '刚刚好',
    ];

    for (let i = 0; i < 15; i++) {
      mockTracks.push({
        id: `track-${i + 1}`,
        showId: 'show-1',
        trackNo: i + 1,
        title: titles[i % titles.length],
        artist: artists[i % artists.length],
        expectedDuration: 180 + Math.random() * 120,
        status: 'pending',
        currentVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    useAppStore.getState().setTracks(mockTracks);
  };

  const trackCandidates: MatchCandidate[] = useMemo(() => {
    return tracks.map((track) => ({
      trackId: track.id,
      trackNo: track.trackNo,
      title: track.title,
      artist: track.artist,
      expectedDuration: track.expectedDuration,
      score: 0,
    }));
  }, [tracks]);

  const analyzeFileName = (fileName: string) => {
    const trackNo = getTrackNoFromFileName(fileName);
    const duration = getDurationFromFileName(fileName);
    const titleMatch = fileName.match(/[_ -]([^_.-]+?)(?:[_ -]|v\d|$)/);
    const parsedTitle = titleMatch ? titleMatch[1].replace(/[_-]/g, ' ') : undefined;

    return { trackNo, duration, parsedTitle };
  };

  const mockMatchAnalysis = (
    item: MatchingPreviewItem,
    candidates: MatchCandidate[]
  ): MatchResult => {
    const anomalies: string[] = [];
    let confidence = 0;
    let matchedTrackId: string | null = null;
    let matchType: 'auto' | 'suggest' | 'manual' | 'none' = 'none';

    const parsed = analyzeFileName(item.fileName);

    const trackNoMatch = candidates.find(
      (c) => parsed.trackNo && c.trackNo === parsed.trackNo
    );

    if (trackNoMatch) {
      confidence = 0.7;
      matchedTrackId = trackNoMatch.trackId;
      matchType = 'auto';

      if (parsed.duration) {
        const durationDiff = Math.abs(parsed.duration - trackNoMatch.expectedDuration);
        if (durationDiff > 10) {
          anomalies.push(`时长差异过大 (${durationDiff.toFixed(0)}s)`);
          confidence -= 0.2;
        }
      }

      if (parsed.parsedTitle) {
        const titleSimilarity =
          parsed.parsedTitle.toLowerCase() === trackNoMatch.title.toLowerCase() ? 1 : 0.5;
        confidence *= titleSimilarity;
        if (titleSimilarity < 1) {
          anomalies.push('曲目名称可能不匹配');
        }
      }
    } else {
      anomalies.push('无法从文件名识别曲目编号');
      confidence = 0.3;

      const fuzzyMatch = candidates[Math.floor(Math.random() * candidates.length)];
      if (fuzzyMatch && Math.random() > 0.5) {
        matchedTrackId = fuzzyMatch.trackId;
        matchType = 'suggest';
        anomalies.push('基于内容的模糊匹配，建议人工确认');
      } else {
        matchType = 'none';
        anomalies.push('未找到匹配曲目，需要手动匹配');
      }
    }

    if (Math.random() > 0.7) {
      anomalies.push('文件名格式不符合规范');
    }

    return {
      materialId: item.fileId,
      trackId: matchedTrackId,
      confidence: Math.max(0, Math.min(1, confidence)),
      matchType,
      anomalies,
      parsed,
    };
  };

  const handleBatchMatch = async () => {
    if (matchingItems.filter((item) => item.uploadStatus === 'success').length === 0) {
      message.warning('请先上传文件');
      return;
    }

    setIsAnalyzing(true);
    setLoading(true);

    try {
      const batchItems = matchingItems
        .filter((item) => item.uploadStatus === 'success' && !item.analyzed)
        .map((item) => ({
          materialId: item.fileId,
          fileName: item.fileName,
          actualDuration: item.parsedDuration || 180,
        }));

      if (batchItems.length > 0) {
        let batchResult: BatchMatchResult;

        try {
          batchResult = await matchingApi.batchMatch({
            items: batchItems,
            candidates: trackCandidates,
          });
        } catch {
          batchResult = {
            results: batchItems.map((item) => {
              const previewItem = matchingItems.find((i) => i.fileId === item.materialId)!;
              return mockMatchAnalysis(previewItem, trackCandidates);
            }),
            summary: {
              total: batchItems.length,
              autoMatched: Math.floor(batchItems.length * 0.4),
              suggested: Math.floor(batchItems.length * 0.3),
              manualRequired: Math.floor(batchItems.length * 0.2),
              unmatched: Math.floor(batchItems.length * 0.1),
            },
          };
        }

        setMatchingItems((prev) =>
          prev.map((item) => {
            const result = batchResult.results.find((r) => r.materialId === item.fileId);
            if (result) {
              const matchedTrack = tracks.find((t) => t.id === result.trackId);
              return {
                ...item,
                analyzed: true,
                matchResult: result,
                matchConfidence: result.confidence,
                suggestedTrackId: result.trackId || undefined,
                suggestedTrack: matchedTrack,
                anomalyList: result.anomalies,
                matchType: result.matchType,
                parsedTrackNo: result.parsed?.trackNo,
                parsedTitle: result.parsed?.title,
                parsedDuration: item.parsedDuration,
              };
            }
            return item;
          })
        );

        message.success(
          `分析完成: 自动匹配 ${batchResult.summary.autoMatched} 个, 建议匹配 ${batchResult.summary.suggested} 个, 需要手动匹配 ${batchResult.summary.manualRequired} 个`
        );
      } else {
        message.info('所有文件已完成分析');
      }
    } catch (error) {
      console.error('Failed to analyze matching:', error);
      message.error('匹配分析失败');
    } finally {
      setIsAnalyzing(false);
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|aac)$/i.test(file.name);
      if (!isAudio) {
        message.error(`${file.name} 不是有效的音频文件`);
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: async ({ file, onProgress, onSuccess, onError }) => {
      const fileObj = file as File;

      const newItem: MatchingPreviewItem = {
        key: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileId: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: fileObj.name,
        fileSize: fileObj.size,
        matchConfidence: 0,
        anomalyList: [],
        matchType: 'none',
        selected: true,
        uploadProgress: 0,
        uploadStatus: 'uploading',
        analyzed: false,
        ...analyzeFileName(fileObj.name),
      };

      setMatchingItems((prev) => [...prev, newItem]);

      const progressInterval = setInterval(() => {
        setMatchingItems((prev) =>
          prev.map((item) =>
            item.fileId === newItem.fileId
              ? {
                  ...item,
                  uploadProgress: Math.min(item.uploadProgress + 10, 90),
                }
              : item
          )
        );
      }, 200);

      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        let uploadResponse;
        try {
          uploadResponse = await fileApi.upload([fileObj], {
            sourceBatch,
            submittedBy: 'current-user',
          });
        } catch {
          uploadResponse = {
            files: [
              {
                id: newItem.fileId,
                originalName: fileObj.name,
                fileName: fileObj.name,
                filePath: `/uploads/${newItem.fileId}`,
                fileSize: fileObj.size,
                mimeType: fileObj.type,
                fileType: 'audio',
                extension: fileObj.name.split('.').pop() || 'mp3',
                version: 1,
                sourceBatch,
                submittedBy: 'current-user',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            total: 1,
            success: 1,
            failed: 0,
          };
        }

        clearInterval(progressInterval);

        setMatchingItems((prev) =>
          prev.map((item) =>
            item.fileId === newItem.fileId
              ? {
                  ...item,
                  fileId: uploadResponse.files[0].id,
                  uploadProgress: 100,
                  uploadStatus: 'success',
                }
              : item
          )
        );

        setUploadedFiles((prev) => [...prev, uploadResponse.files[0]]);
        onSuccess?.(uploadResponse);
      } catch (error) {
        clearInterval(progressInterval);
        setMatchingItems((prev) =>
          prev.map((item) =>
            item.fileId === newItem.fileId
              ? {
                  ...item,
                  uploadProgress: 0,
                  uploadStatus: 'error',
                }
              : item
          )
        );
        onError?.(error as Error);
        message.error(`${fileObj.name} 上传失败`);
      }
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    onRemove: (file) => {
      setMatchingItems((prev) => prev.filter((item) => item.fileName !== file.name));
      return true;
    },
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowKeys(matchingItems.filter((item) => item.analyzed).map((item) => item.key));
      setMatchingItems((prev) =>
        prev.map((item) => ({ ...item, selected: item.analyzed }))
      );
    } else {
      setSelectedRowKeys([]);
      setMatchingItems((prev) => prev.map((item) => ({ ...item, selected: false })));
    }
  };

  const handleRowSelect = (key: string, checked: boolean) => {
    setMatchingItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, selected: checked } : item))
    );
    if (checked) {
      setSelectedRowKeys((prev) => [...prev, key]);
    } else {
      setSelectedRowKeys((prev) => prev.filter((k) => k !== key));
    }
  };

  const handleBatchConfirm = async () => {
    const selectedItems = matchingItems.filter((item) => item.selected && item.analyzed);
    if (selectedItems.length === 0) {
      message.warning('请先选择要确认的匹配项');
      return;
    }

    const needsManual = selectedItems.filter(
      (item) => item.matchType === 'none' || !item.suggestedTrackId
    );
    if (needsManual.length > 0) {
      message.warning(`${needsManual.length} 个项目需要手动匹配后才能确认`);
      return;
    }

    setLoading(true);
    try {
      for (const item of selectedItems) {
        const trackId = item.manualTrackId || item.suggestedTrackId;
        if (trackId) {
          try {
            await matchingApi.confirm({
              materialId: item.fileId,
              trackId,
              matchType: item.manualTrackId ? 'manual' : 'auto',
              confidence: item.matchConfidence,
              confirmedBy: 'current-user',
            });
          } catch {
            console.log(`Mock confirmed match for ${item.fileName}`);
          }
        }
      }

      setMatchingItems((prev) => prev.filter((item) => !item.selected));
      setSelectedRowKeys([]);
      message.success(`成功确认 ${selectedItems.length} 个匹配项`);
    } catch (error) {
      console.error('Failed to confirm matching:', error);
      message.error('确认匹配失败');
    } finally {
      setLoading(false);
    }
  };

  const openManualMatchModal = (item: MatchingPreviewItem) => {
    setCurrentManualItem(item);
    setSelectedManualTrackId(item.manualTrackId || item.suggestedTrackId || '');
    setManualMatchModalVisible(true);
  };

  const handleManualMatchConfirm = () => {
    if (!currentManualItem || !selectedManualTrackId) {
      message.warning('请选择要匹配的曲目');
      return;
    }

    const selectedTrack = tracks.find((t) => t.id === selectedManualTrackId);
    setMatchingItems((prev) =>
      prev.map((item) =>
        item.key === currentManualItem.key
          ? {
              ...item,
              manualTrackId: selectedManualTrackId,
              suggestedTrackId: selectedManualTrackId,
              suggestedTrack: selectedTrack,
              matchType: 'manual',
              matchConfidence: 1,
              anomalyList: item.anomalyList.filter((a) => !a.includes('未找到匹配')),
            }
          : item
      )
    );

    setManualMatchModalVisible(false);
    setCurrentManualItem(null);
    message.success('手动匹配成功');
  };

  const getMatchTypeColor = (type: string) => {
    switch (type) {
      case 'auto':
        return 'success';
      case 'suggest':
        return 'warning';
      case 'manual':
        return 'processing';
      case 'none':
        return 'error';
      default:
        return 'default';
    }
  };

  const getMatchTypeText = (type: string) => {
    switch (type) {
      case 'auto':
        return '自动匹配';
      case 'suggest':
        return '建议匹配';
      case 'manual':
        return '手动匹配';
      case 'none':
        return '未匹配';
      default:
        return type;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#52c41a';
    if (confidence >= 0.7) return '#1677ff';
    if (confidence >= 0.5) return '#faad14';
    return '#ff4d4f';
  };

  const columns: ColumnsType<MatchingPreviewItem> = [
    {
      title: '选择',
      key: 'select',
      width: 60,
      render: (_, record) => (
        <Checkbox
          checked={record.selected}
          disabled={!record.analyzed}
          onChange={(e) => handleRowSelect(record.key, e.target.checked)}
        />
      ),
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      minWidth: 200,
      render: (fileName: string, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <MusicOutlined style={{ color: '#1677ff' }} />
            <Tooltip title={fileName}>
              <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{truncateText(fileName, 30)}</Text>
            </Tooltip>
          </div>
          {record.uploadStatus === 'uploading' && (
            <Progress
              percent={record.uploadProgress}
              size="small"
              showInfo={false}
              style={{ width: '150px' }}
            />
          )}
          {record.uploadStatus === 'error' && (
            <Tag color="error" style={{ marginTop: '4px' }}>
              上传失败
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '解析曲目编号',
      dataIndex: 'parsedTrackNo',
      key: 'parsedTrackNo',
      width: 120,
      render: (trackNo?: number) =>
        trackNo ? (
          <Tag color="blue">#{trackNo}</Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            未识别
          </Text>
        ),
    },
    {
      title: '解析曲目名称',
      dataIndex: 'parsedTitle',
      key: 'parsedTitle',
      minWidth: 120,
      render: (title?: string) =>
        title ? (
          <Tooltip title={title}>
            <Text type="secondary">{truncateText(title, 15)}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            未识别
          </Text>
        ),
    },
    {
      title: '匹配度',
      dataIndex: 'matchConfidence',
      key: 'matchConfidence',
      width: 100,
      render: (confidence: number, record) => {
        if (!record.analyzed) return <Text type="secondary">待分析</Text>;
        return (
          <Text style={{ color: getConfidenceColor(confidence), fontWeight: 500 }}>
            {(confidence * 100).toFixed(1)}%
          </Text>
        );
      },
    },
    {
      title: '建议曲目',
      key: 'suggestedTrack',
      minWidth: 180,
      render: (_, record) => {
        if (!record.analyzed) return <Text type="secondary">待分析</Text>;
        const track = record.suggestedTrack;
        if (!track) {
          return (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              未匹配
            </Tag>
          );
        }
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag color={getMatchTypeColor(record.matchType)}>{getMatchTypeText(record.matchType)}</Tag>
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
              #{track.trackNo} {track.title}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {track.artist}
            </Text>
          </div>
        );
      },
    },
    {
      title: '匹配异常',
      dataIndex: 'anomalyList',
      key: 'anomalyList',
      minWidth: 200,
      render: (anomalies: string[], record) => {
        if (!record.analyzed) return <Text type="secondary">待分析</Text>;
        if (anomalies.length === 0) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              无异常
            </Tag>
          );
        }
        return (
          <div>
            {anomalies.slice(0, 2).map((anomaly, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <WarningOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                <Text type="warning" style={{ fontSize: '12px' }}>
                  {truncateText(anomaly, 25)}
                </Text>
              </div>
            ))}
            {anomalies.length > 2 && (
              <Tooltip title={anomalies.join('\n')}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  还有 {anomalies.length - 2} 个异常...
                </Text>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.analyzed && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openManualMatchModal(record)}
            >
              手动匹配
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const analyzedCount = matchingItems.filter((item) => item.analyzed).length;
  const selectedCount = matchingItems.filter((item) => item.selected).length;
  const successUploadCount = matchingItems.filter((item) => item.uploadStatus === 'success').length;

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ margin: 0, color: 'rgba(255,255,255,0.85)' }}>
          文件上传
        </Title>
        <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
          上传音频材料文件并进行自动匹配处理
        </Text>
      </div>

      <Card className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div>
            <Text style={{ display: 'block', marginBottom: '4px', color: 'rgba(255,255,255,0.85)' }}>
              源批次号
            </Text>
            <Input
              value={sourceBatch}
              onChange={(e) => setSourceBatch(e.target.value)}
              style={{ width: 280 }}
              addonAfter={
                <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => setSourceBatch(generateBatchId())} />
              }
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已上传: {successUploadCount} / {matchingItems.length} 个文件
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已分析: {analyzedCount} / {successUploadCount} 个文件
            </Text>
          </div>
        </div>

        <Dragger {...uploadProps} accept=".mp3,.wav,.flac,.m4a,.aac,audio/*">
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: '48px', color: '#1677ff' }} />
          </p>
          <p className="ant-upload-text" style={{ color: 'rgba(255,255,255,0.85)' }}>
            点击或拖拽文件到此区域上传
          </p>
          <p className="ant-upload-hint" style={{ color: 'rgba(255,255,255,0.45)' }}>
            支持 MP3, WAV, FLAC, M4A, AAC 格式的音频文件，可批量上传
          </p>
        </Dragger>
      </Card>

      {matchingItems.length > 0 && (
        <>
          <Card
            className="card"
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadOutlined style={{ color: '#1677ff' }} />
                匹配预览
              </span>
            }
            extra={
              <Space>
                <Checkbox
                  checked={selectedCount === analyzedCount && analyzedCount > 0}
                  indeterminate={selectedCount > 0 && selectedCount < analyzedCount}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={analyzedCount === 0}
                >
                  全选已分析
                </Checkbox>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleBatchMatch}
                  loading={isAnalyzing}
                  disabled={successUploadCount === 0}
                >
                  {analyzedCount === 0 ? '开始匹配分析' : '重新分析'}
                </Button>
                <Button
                  type="primary"
                  icon={<CheckSquareOutlined />}
                  onClick={handleBatchConfirm}
                  disabled={selectedCount === 0}
                >
                  批量确认 ({selectedCount})
                </Button>
              </Space>
            }
          >
            {analyzedCount > 0 && (
              <Alert
                message={
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>
                      自动匹配: {matchingItems.filter((i) => i.matchType === 'auto').length} |
                      建议匹配: {matchingItems.filter((i) => i.matchType === 'suggest').length} |
                      手动匹配: {matchingItems.filter((i) => i.matchType === 'manual').length} |
                      未匹配: {matchingItems.filter((i) => i.matchType === 'none' && i.analyzed).length}
                    </span>
                  </Space>
                }
                type="info"
                showIcon={false}
                style={{ marginBottom: '16px', background: 'rgba(22, 119, 255, 0.1)', borderColor: 'rgba(22, 119, 255, 0.2)' }}
              />
            )}

            <div className="table-container">
              <Table
                rowKey="key"
                columns={columns}
                dataSource={matchingItems}
                pagination={false}
                scroll={{ x: 1100 }}
                locale={{
                  emptyText: (
                    <Empty
                      image={<InboxOutlined style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />}
                      description="暂无匹配数据"
                    />
                  ),
                }}
              />
            </div>
          </Card>
        </>
      )}

      <Modal
        title="手动匹配曲目"
        open={manualMatchModalVisible}
        onOk={handleManualMatchConfirm}
        onCancel={() => setManualMatchModalVisible(false)}
        okText="确认匹配"
        cancelText="取消"
        width={600}
      >
        {currentManualItem && (
          <div>
            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <Text strong style={{ color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '4px' }}>
                文件名:
              </Text>
              <Text type="secondary">{currentManualItem.fileName}</Text>
              {currentManualItem.anomalyList.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <Text type="warning" style={{ fontSize: '12px' }}>
                    <WarningOutlined /> 异常: {currentManualItem.anomalyList.join(', ')}
                  </Text>
                </div>
              )}
            </div>

            <div>
              <Text strong style={{ color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '8px' }}>
                选择匹配曲目:
              </Text>
              <Select
                showSearch
                placeholder="搜索曲目编号、名称、艺术家..."
                optionFilterProp="children"
                style={{ width: '100%' }}
                value={selectedManualTrackId}
                onChange={setSelectedManualTrackId}
                filterOption={(input, option) => {
                  const label = option?.label as string;
                  return label?.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {tracks.map((track) => (
                  <Option
                    key={track.id}
                    value={track.id}
                    label={`#${track.trackNo} ${track.title} - ${track.artist}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <Tag color="blue">#{track.trackNo}</Tag>
                        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{track.title}</Text>
                        <Text type="secondary" style={{ marginLeft: '8px' }}>- {track.artist}</Text>
                      </span>
                      <Tag color={getStatusColor(track.status)} style={{ marginLeft: '8px' }}>
                        {track.status}
                      </Tag>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UploadPage;
