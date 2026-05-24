
import { useMemo, useRef, useState } from 'react'
import './AuthModals.css'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { loginAPI, registerAPI } from '../../api/authApi'

const passwordRule =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/

const REGISTER_REDIRECT_DELAY_MS = 5000

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function initialLogin() {
  return { email: '', password: '' }
}

function initialRegister() {
  return { email: '', username: '', password: '', confirmPassword: '' }
}

function AuthModals() {
  const { isModalOpen, modalType, closeModal, openModal, loginSuccess: storeLoginSuccess } = useAuthStore()
  const { addToast } = useToastStore()

  const [loginForm, setLoginForm] = useState(initialLogin)
  const [registerForm, setRegisterForm] = useState(initialRegister)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [loginErrors, setLoginErrors] = useState({})
  const [registerErrors, setRegisterErrors] = useState({})
  const [registerSuccess, setRegisterSuccess] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerCountdown, setRegisterCountdown] = useState(0)
  const countdownRef = useRef(null)
  const redirectTimerRef = useRef(null)

  const loginPasswordType = useMemo(
    () => (showLoginPassword ? 'text' : 'password'),
    [showLoginPassword]
  )

  const registerPasswordType = useMemo(
    () => (showRegisterPassword ? 'text' : 'password'),
    [showRegisterPassword]
  )

  function resetLoginForm() {
    setLoginForm(initialLogin)
    setLoginErrors({})
    setShowLoginPassword(false)
  }

  function resetRegisterForm() {
    setRegisterForm(initialRegister)
    setRegisterErrors({})
    setRegisterSuccess('')
    setShowRegisterPassword(false)
    setRegisterCountdown(0)
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = null
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()
    const errors = {}

    if (!loginForm.email.trim()) {
      errors.email = '請輸入電子郵件'
    } else if (!validateEmail(loginForm.email)) {
      errors.email = '電子郵件格式錯誤'
    }

    if (!loginForm.password.trim()) {
      errors.password = '請輸入密碼'
    }

    setLoginErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoginLoading(true)
    try {
      const result = await loginAPI({ email: loginForm.email, password: loginForm.password })
      storeLoginSuccess(
        { email: result.data.email, displayName: result.data.displayName },
        result.data.token
      )
      closeModal()
      resetLoginForm()
      addToast(`歡迎回來，${result.data.displayName ?? result.data.email}！`, 'success', 3000)
    } catch (err) {
      addToast(err?.message ?? '登入失敗，請確認帳號密碼後再試。', 'danger', 4000)
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault()
    const errors = {}

    if (!registerForm.email.trim()) {
      errors.email = '請輸入電子郵件'
    } else if (!validateEmail(registerForm.email)) {
      errors.email = '電子郵件格式錯誤'
    }

    if (!registerForm.username.trim()) {
      errors.username = '請輸入暱稱'
    } else if (registerForm.username.length > 50) {
      errors.username = '暱稱不得超過 50 字'
    }

    if (!registerForm.password.trim()) {
      errors.password = '請輸入密碼'
    } else if (registerForm.password.length < 8) {
      errors.password = '密碼至少8碼'
    } else if (!passwordRule.test(registerForm.password)) {
      errors.password = '密碼需含大寫、小寫、數字、特殊符號'
    }

    if (!registerForm.confirmPassword.trim()) {
      errors.confirmPassword = '請再次輸入密碼'
    } else if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = '兩次密碼不一致'
    }

    setRegisterErrors(errors)
    if (Object.keys(errors).length > 0) return

    setRegisterLoading(true)
    try {
      await registerAPI({
        email: registerForm.email,
        username: registerForm.username,
        password: registerForm.password,
      })
      const totalSeconds = REGISTER_REDIRECT_DELAY_MS / 1000
      setRegisterCountdown(totalSeconds)
      setRegisterSuccess('registered')

      countdownRef.current = setInterval(() => {
        setRegisterCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
            return 0
          }
          return prev - 1
        })
      }, 1000)

      redirectTimerRef.current = setTimeout(() => {
        redirectTimerRef.current = null
        resetRegisterForm()
        openModal('login')
      }, REGISTER_REDIRECT_DELAY_MS)
    } catch (err) {
      addToast(err?.message ?? '註冊失敗，請稍後再試。', 'danger', 4000)
    } finally {
      setRegisterLoading(false)
    }
  }

  function handleClose() {
    closeModal()
    if (modalType === 'login') {
      resetLoginForm()
    } else {
      resetRegisterForm()
    }
  }

  if (!isModalOpen) return null

  return (
    <>
      {/* 背景遮罩，點擊關閉彈窗 */}
      <div className="modal-backdrop fade show" onClick={handleClose} />

      {/* 彈窗主體，點擊內容區不觸發關閉 */}
      <div
        className="modal modal-sheet fade show auth-modal"
        style={{ display: 'block' }}
        tabIndex="-1"
        aria-labelledby={modalType === 'login' ? 'loginModalLabel' : 'registerModalLabel'}
        aria-modal="true"
        role="dialog"
        onClick={handleClose}
      >
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content rounded-4 shadow">
            {modalType === 'login' ? (
              <>
                <div className="modal-header p-5 pb-4 border-bottom-0">
                  <div className="d-flex w-100 align-items-center justify-content-center position-relative">
                    <h1 className="fw-bold mb-0 fs-2" id="loginModalLabel">
                      登入
                    </h1>
                    <button
                      type="button"
                      className="btn-close position-absolute end-0"
                      aria-label="Close"
                      onClick={handleClose}
                    />
                  </div>
                </div>

                <div className="modal-body p-5 pt-0">
                  <form onSubmit={handleLoginSubmit} noValidate>
                    <div className="form-floating mb-3">
                      <input
                        type="email"
                        className={`form-control rounded-3 ${loginErrors.email ? 'is-invalid' : ''}`}
                        id="loginEmail"
                        placeholder="name@example.com"
                        value={loginForm.email}
                        onChange={(event) =>
                          setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                        }
                      />
                      <label htmlFor="loginEmail">電子郵件</label>
                      {loginErrors.email && (
                        <div className="invalid-feedback">{loginErrors.email}</div>
                      )}
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type={loginPasswordType}
                        className={`form-control rounded-3 ${loginErrors.password ? 'is-invalid' : ''}`}
                        id="loginPassword"
                        placeholder="請輸入密碼"
                        value={loginForm.password}
                        onChange={(event) =>
                          setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                        }
                      />
                      <label htmlFor="loginPassword">密碼</label>
                      {loginErrors.password && (
                        <div className="invalid-feedback">{loginErrors.password}</div>
                      )}

                      <div className="form-check mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="showLoginPassword"
                          checked={showLoginPassword}
                          onChange={(event) => setShowLoginPassword(event.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="showLoginPassword">
                          顯示密碼
                        </label>
                      </div>
                    </div>

                    <button
                      className="w-100 mb-2 btn btn-lg rounded-3 btn-primary"
                      type="submit"
                      disabled={loginLoading}
                    >
                      {loginLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          登入中...
                        </>
                      ) : '登入'}
                    </button>
                    <small className="d-flex text-body-secondary justify-content-center">
                      登入即表示同意本站使用條款。
                    </small>

                    <hr className="my-4" />
                    <h2 className="fs-5 fw-bold mb-3 d-flex justify-content-center">或使用第三方登入</h2>
                    <a
                      href="https://www.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-100 py-2 mb-2 btn btn-outline-secondary rounded-3"
                    >
                      <i className="bi bi-google me-1" /> Google 登入
                    </a>
                    <a
                      href="https://www.facebook.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-100 py-2 mb-2 btn btn-outline-primary rounded-3"
                    >
                      <i className="bi bi-facebook me-1" /> Facebook 登入
                    </a>
                    <a
                      href="https://github.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-100 py-2 mb-2 btn btn-outline-secondary rounded-3"
                    >
                      <i className="bi bi-github me-1" /> GitHub 登入
                    </a>

                    <hr className="my-4" />
                    <small className="d-flex justify-content-center text-body-secondary">
                      還沒有帳號？
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-1"
                        onClick={() => {
                          resetRegisterForm()
                          openModal('register')
                        }}
                      >
                        去註冊
                      </button>
                    </small>
                  </form>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header p-5 pb-4 border-bottom-0">
                  <div className="d-flex w-100 align-items-center justify-content-center position-relative">
                    <h1 className="fw-bold mb-0 fs-2" id="registerModalLabel">
                      註冊會員
                    </h1>
                    <button
                      type="button"
                      className="btn-close position-absolute end-0"
                      aria-label="Close"
                      onClick={handleClose}
                    />
                  </div>
                </div>

                <div className="modal-body p-5 pt-0">
                  <form onSubmit={handleRegisterSubmit} noValidate>
                    <div className="form-floating mb-3">
                      <input
                        type="email"
                        className={`form-control rounded-3 ${registerErrors.email ? 'is-invalid' : ''}`}
                        id="registerEmail"
                        placeholder="name@example.com"
                        value={registerForm.email}
                        onChange={(event) =>
                          setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                        }
                      />
                      <label htmlFor="registerEmail">電子郵件</label>
                      {registerErrors.email && (
                        <div className="invalid-feedback">{registerErrors.email}</div>
                      )}
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type="text"
                        className={`form-control rounded-3 ${registerErrors.username ? 'is-invalid' : ''}`}
                        id="registerUsername"
                        placeholder="您的暱稱"
                        value={registerForm.username}
                        onChange={(event) =>
                          setRegisterForm((prev) => ({ ...prev, username: event.target.value }))
                        }
                      />
                      <label htmlFor="registerUsername">暱稱</label>
                      {registerErrors.username && (
                        <div className="invalid-feedback">{registerErrors.username}</div>
                      )}
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type={registerPasswordType}
                        className={`form-control rounded-3 ${registerErrors.password ? 'is-invalid' : ''}`}
                        id="registerPassword"
                        placeholder="請輸入密碼"
                        value={registerForm.password}
                        onChange={(event) =>
                          setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                        }
                      />
                      <label htmlFor="registerPassword">密碼</label>
                      {registerErrors.password && (
                        <div className="invalid-feedback">{registerErrors.password}</div>
                      )}
                    </div>

                    <div className="form-floating mb-3">
                      <input
                        type={registerPasswordType}
                        className={`form-control rounded-3 ${registerErrors.confirmPassword ? 'is-invalid' : ''}`}
                        id="registerPassword2"
                        placeholder="請再次輸入密碼"
                        value={registerForm.confirmPassword}
                        onChange={(event) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            confirmPassword: event.target.value,
                          }))
                        }
                      />
                      <label htmlFor="registerPassword2">確認密碼</label>
                      {registerErrors.confirmPassword && (
                        <div className="invalid-feedback">{registerErrors.confirmPassword}</div>
                      )}

                      <div className="form-check mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="showRegisterPassword"
                          checked={showRegisterPassword}
                          onChange={(event) => setShowRegisterPassword(event.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="showRegisterPassword">
                          顯示密碼
                        </label>
                      </div>
                    </div>

                    <button
                      className="w-100 mb-2 btn btn-lg rounded-3 btn-primary"
                      type="submit"
                      disabled={registerLoading}
                    >
                      {registerLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          註冊中...
                        </>
                      ) : '註冊'}
                    </button>

                    {registerSuccess === 'registered' && (
                      <div className="alert alert-success py-2 mb-2" role="alert">
                        <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
                        註冊成功！將在{' '}
                        <strong>{registerCountdown}</strong>{' '}
                        秒後自動跳轉至登入頁面。
                      </div>
                    )}
                    <small className="text-body-secondary d-flex justify-content-center">
                      註冊即表示同意本站使用條款。
                    </small>

                    <hr className="my-4" />
                    <h2 className="fs-5 fw-bold mb-3 d-flex justify-content-center">或使用第三方登入</h2>
                    <a
                      href="https://www.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-100 py-2 mb-2 btn btn-outline-secondary rounded-3"
                    >
                      <i className="bi bi-google me-1" /> Google 登入
                    </a>
                    <a
                      href="https://www.facebook.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-100 py-2 mb-2 btn btn-outline-primary rounded-3"
                    >
                      <i className="bi bi-facebook me-1" /> Facebook 登入
                    </a>
                    <a
                      href="https://github.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-100 py-2 mb-2 btn btn-outline-secondary rounded-3"
                    >
                      <i className="bi bi-github me-1" /> GitHub 登入
                    </a>

                    <hr className="my-4" />
                    <small className="d-flex justify-content-center text-body-secondary">
                      已經有帳號？
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-1"
                        onClick={() => {
                          resetLoginForm()
                          openModal('login')
                        }}
                      >
                        去登入
                      </button>
                    </small>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default AuthModals