import db from './connection';

const seed = () => {
  const tx = db.transaction(() => {
    db.exec('DELETE FROM task_comments');
    db.exec('DELETE FROM feature_delays');
    db.exec('DELETE FROM material_links');
    db.exec('DELETE FROM manual_judgments');
    db.exec('DELETE FROM param_changes');
    db.exec('DELETE FROM sample_evidences');
    db.exec('DELETE FROM eval_results');
    db.exec('DELETE FROM eval_tasks');
    
    const insertTask = db.prepare(`
      INSERT INTO eval_tasks (name, model_version, index_type, index_params, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const insertResult = db.prepare(`
      INSERT INTO eval_results (
        task_id, recall_at_1, recall_at_10, recall_at_100, precision_at_1,
        avg_latency_ms, p99_latency_ms, qps, memory_usage_mb, cpu_usage,
        index_size_gb, build_time_s, overall_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertEvidence = db.prepare(`
      INSERT INTO sample_evidences (
        task_id, query_id, query_text, expected_result, actual_result,
        is_correct, score, rank, evidence_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertParamChange = db.prepare(`
      INSERT INTO param_changes (task_id, param_name, old_value, new_value, changed_by, change_reason, result_impact)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertJudgment = db.prepare(`
      INSERT INTO manual_judgments (task_id, evidence_id, judgment_type, original_value, modified_value, reason, judged_by, is_temporary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMaterialLink = db.prepare(`
      INSERT INTO material_links (task_id, source_name, target_name, link_type, confidence, verified_by, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertDelay = db.prepare(`
      INSERT INTO feature_delays (
        task_id, feature_name, expected_date, actual_date, status,
        suspected_reason, impact_scope, affected_samples, confirmed_by, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertComment = db.prepare(`
      INSERT INTO task_comments (task_id, comment, comment_by)
      VALUES (?, ?, ?)
    `);
    
    const tasks = [
      {
        name: '商品搜索向量索引评测 v2.1',
        model_version: 'embedding-v2.1.0',
        index_type: 'HNSW',
        index_params: JSON.stringify({ M: 32, efConstruction: 200, efSearch: 64 }),
        status: 'completed',
        created_by: '小许',
        result: {
          recall_at_1: 0.785, recall_at_10: 0.923, recall_at_100: 0.978,
          precision_at_1: 0.812, avg_latency_ms: 12.5, p99_latency_ms: 45.2,
          qps: 8500, memory_usage_mb: 2048, cpu_usage: 0.35,
          index_size_gb: 15.6, build_time_s: 1250, overall_score: 89.5
        },
        paramChanges: [
          { param_name: 'efSearch', old_value: '48', new_value: '64', changed_by: '小许', change_reason: '提升召回率', result_impact: 'Recall@10 提升 2.1%' }
        ]
      },
      {
        name: '商品搜索向量索引评测 v2.0',
        model_version: 'embedding-v2.0.0',
        index_type: 'HNSW',
        index_params: JSON.stringify({ M: 32, efConstruction: 200, efSearch: 48 }),
        status: 'completed',
        created_by: '小许',
        result: {
          recall_at_1: 0.762, recall_at_10: 0.902, recall_at_100: 0.965,
          precision_at_1: 0.798, avg_latency_ms: 10.8, p99_latency_ms: 38.5,
          qps: 9200, memory_usage_mb: 2048, cpu_usage: 0.32,
          index_size_gb: 15.6, build_time_s: 1250, overall_score: 87.2
        },
        paramChanges: []
      },
      {
        name: '用户行为向量索引评测 v1.5',
        model_version: 'behavior-embedding-v1.5.0',
        index_type: 'IVF_FLAT',
        index_params: JSON.stringify({ nlist: 4096, nprobe: 32 }),
        status: 'warning',
        created_by: '小许',
        result: null,
        paramChanges: [
          { param_name: 'nprobe', old_value: '16', new_value: '32', changed_by: '小许', change_reason: '优化低召回问题', result_impact: null }
        ]
      },
      {
        name: '内容推荐向量索引评测 v3.0',
        model_version: 'content-embedding-v3.0.0',
        index_type: 'DISKANN',
        index_params: JSON.stringify({ search_list_size: 100, build_D: 128 }),
        status: 'completed',
        created_by: '小李',
        result: {
          recall_at_1: 0.721, recall_at_10: 0.885, recall_at_100: 0.956,
          precision_at_1: 0.745, avg_latency_ms: 25.3, p99_latency_ms: 85.6,
          qps: 4200, memory_usage_mb: 512, cpu_usage: 0.45,
          index_size_gb: 8.2, build_time_s: 3600, overall_score: 82.1
        },
        paramChanges: []
      },
      {
        name: '商品搜索向量索引评测 v1.9',
        model_version: 'embedding-v1.9.0',
        index_type: 'HNSW',
        index_params: JSON.stringify({ M: 32, efConstruction: 200, efSearch: 48 }),
        status: 'completed',
        created_by: '小王',
        result: {
          recall_at_1: 0.745, recall_at_10: 0.889, recall_at_100: 0.952,
          precision_at_1: 0.778, avg_latency_ms: 11.2, p99_latency_ms: 40.1,
          qps: 9000, memory_usage_mb: 1980, cpu_usage: 0.31,
          index_size_gb: 14.8, build_time_s: 1180, overall_score: 85.6
        },
        paramChanges: []
      }
    ];
    
    const taskIds: number[] = [];
    tasks.forEach((task, idx) => {
      const info = insertTask.run(task.name, task.model_version, task.index_type, task.index_params, task.status, task.created_by);
      const taskId = Number(info.lastInsertRowid);
      taskIds.push(taskId);
      
      if (task.result) {
        insertResult.run(
          taskId,
          task.result.recall_at_1, task.result.recall_at_10, task.result.recall_at_100,
          task.result.precision_at_1, task.result.avg_latency_ms, task.result.p99_latency_ms,
          task.result.qps, task.result.memory_usage_mb, task.result.cpu_usage,
          task.result.index_size_gb, task.result.build_time_s, task.result.overall_score
        );
      }
      
      task.paramChanges.forEach(pc => {
        insertParamChange.run(taskId, pc.param_name, pc.old_value, pc.new_value, pc.changed_by, pc.change_reason, pc.result_impact);
      });
      
      const queryTexts = [
        '夏季连衣裙新款', '男士运动鞋透气', '儿童益智玩具',
        '手机壳 个性创意', '笔记本电脑 游戏本', '无线蓝牙耳机',
        '家居装饰 北欧风', '厨房用具 不粘锅', '护肤套装 补水',
        '运动健身器材'
      ];
      
      for (let i = 0; i < 20; i++) {
        const qIdx = i % queryTexts.length;
        const isCorrect = i < 16 ? 1 : 0;
        insertEvidence.run(
          taskId,
          `q_${taskId}_${i}`,
          queryTexts[qIdx],
          `expected_doc_${i}_${qIdx}`,
          isCorrect ? `expected_doc_${i}_${qIdx}` : `wrong_doc_${i}_${qIdx}`,
          isCorrect,
          0.85 + Math.random() * 0.15,
          isCorrect ? Math.floor(Math.random() * 10) + 1 : Math.floor(Math.random() * 50) + 20,
          i % 2 === 0 ? 'recall' : 'precision'
        );
      }
      
      if (idx === 0) {
        insertJudgment.run(
          taskId, 12, 'evidence_correction', '0', '1',
          '该样本实际上是相关的，因为用户搜索"夏季连衣裙新款"，返回结果虽然款式不同但属于同类目',
          '小许', 1
        );
        insertJudgment.run(
          taskId, 15, 'evidence_correction', '0', '1',
          '同义词匹配，"运动鞋"和"休闲跑鞋"属于同一类',
          '小许', 0
        );
      }
      
      if (idx === 0) {
        insertMaterialLink.run(
          taskId,
          '夏季连衣裙',
          '夏日碎花长裙',
          'synonym_mapping',
          0.92,
          '小许',
          '2026-06-15 10:30:00'
        );
        insertMaterialLink.run(
          taskId,
          '男士运动鞋',
          '男款跑步鞋',
          'category_alias',
          0.88,
          null,
          null
        );
      }
      
      if (idx === 2) {
        insertDelay.run(
          taskId,
          'user_profile_v2_feature',
          '2026-06-18',
          null,
          'pending',
          '数据ETL任务延迟，特征更新未按时完成',
          '影响约15%的测试样本，主要涉及新用户行为数据',
          150,
          null,
          null
        );
      }
      
      if (idx === 0) {
        insertComment.run(taskId, '本次评测参数调整后效果显著，Recall@10提升明显', '小许');
        insertComment.run(taskId, '注意第12、15号样本已人工修正，接班时请确认', '小许');
      }
    });
    
    console.log(`Seed completed: ${taskIds.length} tasks inserted`);
  });
  
  tx();
  console.log('Database seeded successfully!');
};

seed();
