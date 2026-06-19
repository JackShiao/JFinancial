import './OpinionSection.css'

function OpinionSection() {
  return (
    <section className="opinion-section py-5 bg-light" aria-label="觀點摘要區塊">
      <div className="container">
        <div className="card opinion-card p-3 mb-4">
          <h3>鉅亨號</h3>
          <div className="card-body">
            <p className="card-text">
              鉅亨號是由鉅亨網推出的財經觀點平台，提供專業分析師、投資達人和財經媒體的獨家觀點與深度分析，<br />涵蓋全球市場趨勢、個股解析、產業洞察等多元內容，幫助投資人掌握最新財經動態，做出明智的投資決策。
            </p>
            <a
              href="https://hao.cnyes.com/wall/recommend"
              className="btn btn-outline-secondary btn-sm mt-3"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看完整內容 <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OpinionSection