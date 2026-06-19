import { useState } from 'react'
import './About.css'

function About() {
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="position-relative">
          <img
            src="/img/about/GforMe.png"
            className="d-block w-100 about-hero-image"
            alt="關於大圖"
            loading="lazy"
            onError={(event) => {
              const img = event.currentTarget
              if (img.dataset.fallbackApplied === 'true') return
              img.dataset.fallbackApplied = 'true'
              img.src = '/img/default.png'
            }}
          />
          <div className="container">
            <div className="carousel-caption about-hero-caption">
              <h1>About</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="container marketing">
        <div className="row featurette">
          <div className="col-md-5 order-md-1">
            <img
              src="/img/about/969A9964-2F07-4CDA-A417-B75F040991DB.jpg"
              alt="J"
              className="bd-placeholder-img bd-placeholder-img-lg featurette-image img-fluid mx-auto"
              loading="lazy"
              style={{ width: '400px', height: '500px', objectFit: 'cover', objectPosition: 'center 90%' }}
              onError={(event) => {
                const img = event.currentTarget
                if (img.dataset.fallbackApplied === 'true') return
                img.dataset.fallbackApplied = 'true'
                img.src = '/img/default.png'
              }}
            />
          </div>

          <div className="col-md-7 order-md-2 mt-md-0 mt-4 d-flex align-items-center justify-content-center flex-column">
            <p className="fs-4 fw-bold">
              哈摟，我是蕭宇傑，這是一個由我個人興趣所建立的財經資訊網站，目的是希望能夠提供一個簡單實用的平台，讓使用者可以方便地查詢各種財經資訊，追蹤一些即時新聞等。
            </p>
            <p className="fs-5">
              製作這個網站的動機，主要是因為上一份工作是在銀行做理財專員，時不時會跟主管還有客戶報告目前市場狀況，網站的內容是我平常蒐集資料的方向，目前仍在持續完善中，若有任何建議或想法，請不吝指教！
            </p>
          </div>
        </div>

        <hr className="featurette-divider" />

        <div className="row featurette">
          <div className="col-md-7">
            <h2 className="featurette-heading fw-normal lh-1">你有發現嗎？</h2>
            <p className="mt-2 text-body-secondary fs-2">其實網站裡很多張圖片是使用 AI 生成</p>
            <p className="fs-5">
              像是這張圖片就是用 Google Gemini 生成，你應該會發現吉他上面的 Gemini logo，我在每張 AI 生成的圖片都放上了對應的 AI logo。
            </p>
            <p className="mt-5 fs-6">財經網總共有 11 張圖片是由 AI 生成，你能找到藏在圖片裡所有的 logo 嗎？</p>

            <div className="d-flex align-items-center gap-3">
              <button type="button" className="btn btn-light ms-5" onClick={() => setShowAnswer(true)}>
                解答
              </button>
              {showAnswer && (
                <span>
                  14 <img src="/img/Gemini.png" alt="Google Gemini logo" style={{ width: '30px' }} />、2{' '}
                  <img src="/img/chatGPT.png" alt="ChatGPT logo" style={{ width: '30px' }} />、1 <span style={{ fontSize: '20px' }}>🍌</span>
                </span>
              )}
            </div>

            <p className="mt-3">
              圖片來源：
              <a href="/img/圖片資訊.html" target="_blank" rel="noopener noreferrer">
                圖片資訊
              </a>{' '}
              、Google Gemini <img src="/img/Gemini.png" alt="Google Gemini logo" style={{ width: '30px' }} />、ChatGPT{' '}
              <img src="/img/chatGPT.png" alt="ChatGPT logo" style={{ width: '30px' }} />、Nanobanana.io <span style={{ fontSize: '20px' }}>🍌</span>
            </p>
          </div>

          <div className="col-md-5 d-flex align-items-center justify-content-center">
            <img
              src="/img/about/myFAV.png"
              alt="興趣"
              className="bd-placeholder-img bd-placeholder-img-lg featurette-image img-fluid mx-auto"
              loading="lazy"
              style={{ objectFit: 'cover' }}
              onError={(event) => {
                const img = event.currentTarget
                if (img.dataset.fallbackApplied === 'true') return
                img.dataset.fallbackApplied = 'true'
                img.src = '/img/default.png'
              }}
            />
          </div>
        </div>

        <hr className="featurette-divider" />
      </section>
    </main>
  )
}

export default About