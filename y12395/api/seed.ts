import { v4 as uuidv4 } from 'uuid'
import { getDb } from './db.js'

export function seedDatabase(): void {
  const db = getDb()

  const materialCount = db.prepare('SELECT COUNT(*) as count FROM source_materials').get() as { count: number }
  if (materialCount.count > 0) return

  const insertMaterial = db.prepare(`
    INSERT INTO source_materials (id, type, title, content, source_file, version)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertAlias = db.prepare(`
    INSERT INTO fingering_aliases (id, standard_name, alias_name, version, normalized, normalized_at, group_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertSnapshot = db.prepare(`
    INSERT INTO change_snapshots (id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMapping = db.prepare(`
    INSERT INTO score_annotation_mapping (id, score_id, annotation_id, report_section)
    VALUES (?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    const sm1 = uuidv4()
    const sm2 = uuidv4()
    const sm3 = uuidv4()
    const sm4 = uuidv4()
    const sm5 = uuidv4()
    const sm6 = uuidv4()

    insertMaterial.run(
      sm1, 'score', '流水（神奇秘谱本）',
      '第一段：起調散音泛起，歷七弦如泉初湧。第二段：吟猱相雜，進復退復交織，如溪澗潺湲。第三段：撞逗連用，抹挑勾踢並作，水勢漸盛。第四段：大吟長猱，滾拂相繼，波濤洶湧。第五段：泛音收束，餘韻悠長。指法要領：吟用圓活，猱取蒼勁，進復如流水不斷，退復似迴瀾有意。',
      '神奇秘谱.pdf', '神奇秘谱'
    )

    insertMaterial.run(
      sm2, 'score', '流水（自遠堂本）',
      '第一段：散起泛音，歷弦輕靈。第二段：吟與猱交替，進復退復相承，溪聲隱約。第三段：撞法峻急，逗音短促，勾踢抹挑變化多端，水勢奔騰。第四段：滾拂大吟，波瀾壯闊。第五段：泛音終曲，意猶未盡。按：此本第三段與神奇秘譜本第四段段落互有錯位，學者當細加比對。指法要領：吟宜含蓄，猱當有力，進復退復皆需腕活指鬆。',
      '自远堂琴谱.pdf', '自远堂'
    )

    insertMaterial.run(
      sm3, 'score', '阳关三叠（自远堂本）',
      '第一疊：渭城朝雨浥輕塵，客舍青青柳色新。勸君更盡一杯酒，西出陽關無故人。指法：散挑七弦，勾四弦，吟揉相連。第二疊：反覆詠嘆，進復退復點綴其間，情感更深。第三疊：變奏加花，撞逗交錯，悲涼之意更濃。按：此本第二疊末段混入神奇秘譜本陽關三疊之指法片段，疑為流傳中竄入，已於註解中標出。',
      '自远堂琴谱.pdf', '自远堂'
    )

    insertMaterial.run(
      sm4, 'annotation', '神奇秘谱指法注解',
      '吟：手指按弦，左右微動，令聲搖曳如蟬鳴。此譜中吟法最為圓活，不限左右搖動之幅。猱：手指按弦，上下急動，聲如猿啼。與吟異者，猱取蒼勁有力，動幅較大。撞：按弦得聲後，急向上方一撞即止，聲如鐘磬。逗：按弦得聲後，速向上方一逗即歸本位，似撞而更短促。進復：按弦上行一音即還本位，如進一步復退。退復：按弦下行一音即還本位，如退一步復進。',
      '神奇秘谱指法注.pdf', '神奇秘谱'
    )

    insertMaterial.run(
      sm5, 'annotation', '自远堂指法注解',
      '吟：左指按弦，微微搖動，取聲幽婉。此譜吟法較含蓄，搖幅宜小。猱：按弦上下急動，取聲蒼古。自遠堂猱法偏剛，需以腕力帶動。撞：得聲後上撞急止，取果斷之意。此本撞法與逗法略有區別，撞可稍緩，逗必須急。逗：按弦得聲速上逗即歸，比撞更短。進復：上行一音復歸，需腕活指穩。退復：下行一音復歸，與進復相對。',
      '自远堂指法注.pdf', '自远堂'
    )

    insertMaterial.run(
      sm6, 'note', '流水版本对比研究笔记',
      '經比對神奇秘譜本與自遠堂本《流水》，發現以下問題：一、指法異名：神奇秘譜中「吟」與自遠堂中「猱」實指同一類手法之不同稱謂，二者皆為左指搖動取聲，僅幅度風格略有差異。二、段落錯位：神奇秘譜本第三段"撞逗連用"段，在自遠堂本中出現在第四段位置，而自遠堂本第三段實為神奇秘譜本第四段之內容，二本段落次序互換。三、陽關三疊版本混用：自遠堂本《陽關三疊》第二疊末段中混入神奇秘譜本之指法片段，疑為傳抄時竄入，需在比對時特別標注。',
      '研究笔记.docx', '综合'
    )

    const aliasGroup1 = uuidv4()
    const aliasGroup2 = uuidv4()
    const aliasGroup3 = uuidv4()

    insertAlias.run(uuidv4(), '吟', '猱', '自远堂', 0, null, aliasGroup1)
    insertAlias.run(uuidv4(), '吟', '吟', '神奇秘谱', 0, null, aliasGroup1)
    insertAlias.run(uuidv4(), '撞', '逗', '自远堂', 0, null, aliasGroup2)
    insertAlias.run(uuidv4(), '撞', '撞', '神奇秘谱', 0, null, aliasGroup2)
    insertAlias.run(uuidv4(), '进复', '退复', '自远堂', 0, null, aliasGroup3)
    insertAlias.run(uuidv4(), '进复', '进复', '神奇秘谱', 0, null, aliasGroup3)

    const snapshotId = uuidv4()
    insertSnapshot.run(
      snapshotId,
      'fingering_alias',
      aliasGroup1,
      'standard_name',
      '猱',
      '吟',
      '统一指法称谓：经考证神奇秘谱与自远堂中吟猱实为同类手法，以"吟"为标准名'
    )

    insertMapping.run(uuidv4(), sm1, sm4, '第一段指法对照')
    insertMapping.run(uuidv4(), sm1, sm4, '第二段指法对照')
    insertMapping.run(uuidv4(), sm2, sm5, '第一段指法对照')
    insertMapping.run(uuidv4(), sm2, sm5, '第二段指法对照')
    insertMapping.run(uuidv4(), sm3, sm5, '阳关三叠指法对照')
    insertMapping.run(uuidv4(), sm1, sm6, '流水版本对比')
    insertMapping.run(uuidv4(), sm2, sm6, '流水版本对比')
    insertMapping.run(uuidv4(), sm3, sm6, '阳关三叠版本混用标注')
  })

  transaction()
  console.log('Database seeded successfully')
}
