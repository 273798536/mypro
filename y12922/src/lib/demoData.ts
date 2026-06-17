import type { ImportRequest } from '@shared/types';

export function buildDemoImportRequest(): ImportRequest {
  const ann = (annotator: string, label: string) => ({ annotator, label });
  return {
    batchNo: 'DEMO-2026-001',
    sourceFileName: 'demo.json',
    samples: [
      { sampleKey: 's01', content: '用户问：如何重置密码？', splitTag: 'train', annotations: [ann('张', '是'), ann('王', '是'), ann('李', '是')] },
      { sampleKey: 's02', content: '用户问：怎么注销账号？', splitTag: 'train', annotations: [ann('张', '否'), ann('王', '否'), ann('李', '否')] },
      { sampleKey: 's03', content: '用户问：密码忘了怎么办？', splitTag: 'train', annotations: [ann('张', '是'), ann('王', '否'), ann('李', '是')] },
      { sampleKey: 's04', content: '用户问：能开发票吗？', splitTag: 'train', annotations: [ann('张', '否'), ann('王', '否'), ann('李', '否')] },
      { sampleKey: 's05', content: '用户问：怎么修改绑定手机？', splitTag: 'train', annotations: [ann('张', '否'), ann('王', '否'), ann('李', '是')] },
      { sampleKey: 's06', content: '用户问：收不到验证码？', splitTag: 'train', annotations: [ann('张', '是'), ann('王', '是'), ann('李', '是')] },
      { sampleKey: 's07', content: '用户问：账号被锁定了？', splitTag: 'train', annotations: [ann('张', '是'), ann('王', '是'), ann('李', '否')] },
      { sampleKey: 's08', content: '用户问：怎么解绑邮箱？', splitTag: 'train', annotations: [ann('张', '否'), ann('王', '否'), ann('李', '否')] },
      { sampleKey: 's09', content: '用户问：怎么开通会员？', splitTag: 'eval', annotations: [ann('张', '是'), ann('王', '是'), ann('李', '是')] },
      { sampleKey: 's10', content: '用户问：会员能退吗？', splitTag: 'eval', annotations: [ann('张', '是'), ann('王', '是'), ann('李', '是')] },
      { sampleKey: 's11', content: '用户问：怎么领优惠券？', splitTag: 'eval', annotations: [ann('张', '是'), ann('王', '是'), ann('李', '是')] },
      { sampleKey: 's12', content: '用户问：订单怎么取消？', splitTag: 'eval', annotations: [ann('张', '是'), ann('王', '是'), ann('李', '是')] },
      { sampleKey: 's13', content: '用户问：怎么申请退款？', splitTag: 'eval', annotations: [ann('张', '是'), ann('王', '是'), ann('李', '是')] },
      { sampleKey: 's14', content: '用户问：退款多久到账？', splitTag: 'eval', annotations: [ann('张', '否'), ann('王', '否'), ann('李', '是')] },
    ],
  };
}
