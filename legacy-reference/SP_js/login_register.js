document.addEventListener('DOMContentLoaded', function () {

    // 驗證 email格式 及 密碼複雜度
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePasswordComplexity = (pwd) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(pwd);

    // Modal 關閉時自動清空表單並移除驗證提示
    const loginModalEl = document.getElementById('loginModal');
    const registerModalEl = document.getElementById('registerModal');
    function clearFormValidation(form) {
        if (!form) return;
        form.reset();
        // 移除所有 is-invalid class
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        // 移除所有 invalid-feedback 元素
        form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
        // 強制密碼欄位 type 設回 password
        const pwd1 = form.querySelector('#loginPassword') || form.querySelector('#registerPassword');
        const pwd2 = form.querySelector('#registerPassword2');
        if (pwd1) pwd1.type = 'password';
        if (pwd2) pwd2.type = 'password';
    }
    if (loginModalEl) {
        loginModalEl.addEventListener('hidden.bs.modal', function () {
            const form = loginModalEl.querySelector('form');
            clearFormValidation(form);
        });
    }
    if (registerModalEl) {
        registerModalEl.addEventListener('hidden.bs.modal', function () {
            const form = registerModalEl.querySelector('form');
            clearFormValidation(form);
        });
    }


    // 登入表單驗證
    const loginForm = document.querySelector('#loginModal form');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            let valid = true;
            // 移除舊訊息
            loginForm.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            loginForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            // 取得欄位
            const email = loginForm.querySelector('#loginEmail');
            const pwd = loginForm.querySelector('#loginPassword');
            // 驗證 email
            if (!email.value.trim()) {
                valid = false;
                email.classList.add('is-invalid');
                email.insertAdjacentHTML('afterend', '<div class="invalid-feedback">請輸入電子郵件</div>');
            } else if (!validateEmail(email.value)) {
                valid = false;
                email.classList.add('is-invalid');
                email.insertAdjacentHTML('afterend', '<div class="invalid-feedback">電子郵件格式錯誤</div>');
            }
            // 驗證密碼
            if (!pwd.value.trim()) {
                valid = false;
                pwd.classList.add('is-invalid');
                pwd.insertAdjacentHTML('afterend', '<div class="invalid-feedback">請輸入密碼</div>');
            } else if (pwd.value.length < 8) {
                valid = false;
                pwd.classList.add('is-invalid');
                pwd.insertAdjacentHTML('afterend', '<div class="invalid-feedback">密碼至少8碼</div>');
            } else if (!validatePasswordComplexity(pwd.value)) {
                valid = false;
                pwd.classList.add('is-invalid');
                pwd.insertAdjacentHTML('afterend', '<div class="invalid-feedback">密碼需含大寫、小寫、數字、特殊符號</div>');
            }
            if (valid) {
                // 通過驗證，可送出（此處僅示範）
                alert('登入驗證通過！');
                loginForm.reset(); // 清空欄位
                // loginForm.submit(); // 實際串接後端時再啟用
            }
        });
    }

    // 註冊表單驗證
    const regForm = document.querySelector('#registerModal form');
    if (regForm) {
        regForm.addEventListener('submit', function (e) {
            e.preventDefault();
            let valid = true;
            regForm.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            regForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            const email = regForm.querySelector('#registerEmail');
            const pwd = regForm.querySelector('#registerPassword');
            const pwd2 = regForm.querySelector('#registerPassword2');
            // 驗證 email
            if (!email.value.trim()) {
                valid = false;
                email.classList.add('is-invalid');
                email.insertAdjacentHTML('afterend', '<div class="invalid-feedback">請輸入電子郵件</div>');
            } else if (!validateEmail(email.value)) {
                valid = false;
                email.classList.add('is-invalid');
                email.insertAdjacentHTML('afterend', '<div class="invalid-feedback">電子郵件格式錯誤</div>');
            }
            // 驗證密碼
            if (!pwd.value.trim()) {
                valid = false;
                pwd.classList.add('is-invalid');
                pwd.insertAdjacentHTML('afterend', '<div class="invalid-feedback">請輸入密碼</div>');
            } else if (pwd.value.length < 8) {
                valid = false;
                pwd.classList.add('is-invalid');
                pwd.insertAdjacentHTML('afterend', '<div class="invalid-feedback">密碼至少8碼</div>');
            } else if (!validatePasswordComplexity(pwd.value)) {
                valid = false;
                pwd.classList.add('is-invalid');
                pwd.insertAdjacentHTML('afterend', '<div class="invalid-feedback">密碼需含大寫、小寫、數字、特殊符號</div>');
            }
            // 驗證確認密碼 
            if (!pwd2.value.trim()) {
                valid = false;
                pwd2.classList.add('is-invalid');
                pwd2.insertAdjacentHTML('afterend', '<div class="invalid-feedback">請再次輸入密碼</div>');
            } else if (pwd.value !== pwd2.value) {
                valid = false;
                pwd2.classList.add('is-invalid');
                pwd2.insertAdjacentHTML('afterend', '<div class="invalid-feedback">兩次密碼不一致</div>');
            }
            if (valid) {
                alert('註冊驗證通過！');
                regForm.reset(); // 清空欄位
                // regForm.submit(); // 實際串接後端時再啟用
            }
        });
    }


    // 顯示/隱藏密碼切換
    const loginPwd = document.getElementById('loginPassword');
    const showLoginPwd = document.getElementById('showLoginPassword');
    if (loginPwd && showLoginPwd) {
        showLoginPwd.addEventListener('change', function () {
            loginPwd.type = this.checked ? 'text' : 'password';
        });
    }

    // 註冊（同時控制兩個欄位）
    const regPwd = document.getElementById('registerPassword');
    const regPwd2 = document.getElementById('registerPassword2');
    const showRegPwd = document.getElementById('showRegisterPassword');
    if (regPwd && regPwd2 && showRegPwd) {
        showRegPwd.addEventListener('change', function () {
            const type = this.checked ? 'text' : 'password';
            regPwd.type = type;
            regPwd2.type = type;
        });
    }

});