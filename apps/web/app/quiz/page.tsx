'use client'

import { useMemo, useState } from 'react'

type Q = {
  id: number
  q: string
  options: string[]
  answer: number
  note: string
}

const BANK: Q[] = [
  { id: 1, q: '何者為在陸上機場供航空器上下旅客、裝卸郵件或貨物、加油、停機或維修等目的而劃設之區域？', options: ['停機坪', '活動區', '操作區', '勤務道路'], answer: 0, note: '「停機坪」是供上下客、裝卸、加油、停機/維修之區域。' },
  { id: 2, q: '桃園國際機場公司何單位負責車輛通行證核發、駕駛許可核發、行車管理、違規取締？', options: ['航務處', '維護處', '工程處', '營運控制中心'], answer: 0, note: '車證與空側駕駛許可管理重點單位是航務處。' },
  { id: 3, q: '下列何者非屬管制區域？', options: ['出境大廳', '行李處理場', '勤務道', '停機坪'], answer: 0, note: '出境大廳不屬空側管制區。' },
  { id: 4, q: '空側活動區車輛通行證類別以下何種不涵蓋在內？', options: ['工作通行證', '車輛通行證', '施工車輛通行證', '臨時車輛通行證'], answer: 0, note: '題庫設定正解為「工作通行證」。' },
  { id: 5, q: '發布雷(暴)雨當空時，除例外航機操作外，何項作業須立即停止？', options: ['滾帶車裝載旅客行李', '航機進位靠橋旅客下機作業', '航機後推至滑行道開車', '航機拖車作業'], answer: 0, note: '雷(暴)雨當空，停機坪地面作業原則停止。' },
  { id: 6, q: '「雷暴(雨)接近」TS/TSRA（3~8km）時，雷擊預警燈號顯示為何？', options: ['僅文字+閃燈（無警報音）', '文字+閃燈+警報音', '僅閃燈', '僅文字'], answer: 0, note: '接近：預警但通常不鳴警報音。' },
  { id: 7, q: '「雷暴(雨)當空」TS(OVHD)/TSRA(OVHD)（3km內）時，雷擊預警燈號顯示為何？', options: ['文字+閃燈+警報音', '文字+閃燈（無警報音）', '僅閃燈', '僅文字'], answer: 0, note: '當空：等級更高，會有警報音。' },
  { id: 8, q: '航機自滑行道進坪時，車道管制員舉起交通指揮棒，車輛應？', options: ['停止行進', '快速前進', '慢速通過', '繼續行駛'], answer: 0, note: '看見管制停車手勢要立即停。' },
  { id: 9, q: '何者非在陸上機場供航空器上下客、裝卸、加油、停機/維修之區域？', options: ['滑行道', '停機坪', 'C9停機位', 'D4停機位'], answer: 0, note: '滑行道是滑行用途，不是停機坪功能區。' },
  { id: 10, q: '機場內供航空器起飛、降落及滑行之區域（含操作區及停機坪）是？', options: ['活動區', '跑道', '維修機坪', '滑行道'], answer: 0, note: '整體稱「活動區」。' },
  { id: 11, q: '車輛機具穿越滑行道時，下列何者正確？', options: ['選項皆是', '注意航空器動態及地面指揮', '於停車標誌處暫停', '禮讓航空器優先滑行'], answer: 0, note: '穿越滑行道三原則：停、看、讓。' },
  { id: 12, q: '人員在活動區內操作油罐車，應持有航務處核發之何者？', options: ['駕駛許可', '施工證', '臨時通行證', '操作學習證'], answer: 0, note: '油車屬高風險作業，需駕駛許可。' },
  { id: 13, q: '所有人員進入操作區及活動區時應穿著？', options: ['反光背心', '安全帽', '外套', '太陽眼鏡'], answer: 0, note: '空側最基本 PPE：反光背心。' },
  { id: 14, q: '未經授權許可，車輛/裝備是否可以穿越機翼、機腹下方？', options: ['不可以', '可以', '無規定', '視情況'], answer: 0, note: '機翼機腹下方一律視高風險區。' },
  { id: 15, q: '桃園機場發布「雷(暴)雨當空」時，所有地面作業應？', options: ['停止', '繼續', '視情況', '無規定'], answer: 0, note: '當空警示下原則停作，依程序例外處理。' },
]

export default function QuizPage() {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = useMemo(() => BANK[idx], [idx])

  const choose = (i: number) => {
    if (done || picked !== null) return
    setPicked(i)
    if (i === q.answer) setScore((s) => s + 1)
  }

  const next = () => {
    if (idx + 1 >= BANK.length) {
      setDone(true)
      return
    }
    setIdx((x) => x + 1)
    setPicked(null)
  }

  const restart = () => {
    setIdx(0)
    setPicked(null)
    setScore(0)
    setDone(false)
  }

  if (done) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <h1>空側駕駛考試訓練</h1>
        <h2>測驗完成</h2>
        <p>成績：{score} / {BANK.length}</p>
        <button onClick={restart}>重新開始</button>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1>空側駕駛考試訓練（網頁版）</h1>
      <p>第 {idx + 1} 題 / 共 {BANK.length} 題｜目前分數：{score}</p>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Q{q.id}. {q.q}</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {q.options.map((opt, i) => {
            const isCorrect = picked !== null && i === q.answer
            const isWrongPick = picked === i && i !== q.answer
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                style={{
                  textAlign: 'left',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  background: isCorrect ? '#dcfce7' : isWrongPick ? '#fee2e2' : '#fff',
                  cursor: picked === null ? 'pointer' : 'default',
                }}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            )
          })}
        </div>

        {picked !== null && (
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: 0 }}>
              {picked === q.answer ? '✅ 答對' : `❌ 答錯，正確答案：${String.fromCharCode(65 + q.answer)}`}
            </p>
            <p style={{ color: '#555' }}>重點：{q.note}</p>
            <button onClick={next}>下一題</button>
          </div>
        )}
      </section>
    </main>
  )
}
