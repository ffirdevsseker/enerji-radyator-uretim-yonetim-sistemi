document.addEventListener('DOMContentLoaded', () => {
    const panelsContainer = document.querySelector('.tab-panels');
    const loginPanel = document.querySelector('#loginForm');
    let resizeTimeout;

    function setPanelsHeight() {
        if (!panelsContainer || !loginPanel) return;
        // Küçük ekranlarda (CSS media query ile uyumlu) otomatik yüksekliğe izin ver
        if (window.matchMedia('(max-width: 520px)').matches) {
            panelsContainer.style.setProperty('--auth-panel-height', 'auto');
            return;
        }
        const height = loginPanel.scrollHeight; // login formunun içerik yüksekliği
        panelsContainer.style.setProperty('--auth-panel-height', height + 'px');
    }

    // Tab değişince render sonrası yükseklik güncelle
    // Tab eventleri aşağıda (orijinal tabButtons tanımlandıktan sonra) setPanelsHeight tetikleniyor.

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(setPanelsHeight, 120);
    });

    // İlk yüklemede
    setTimeout(setPanelsHeight, 50);
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const footerStates = document.querySelectorAll('.card-footer p');
    const tabSwitchers = document.querySelectorAll('.tab-switch');
    const authCard = document.querySelector('.auth-card');

    function clearMessages() {
        const existingMessages = authCard.querySelectorAll('.message');
        existingMessages.forEach(message => message.remove());
    }

    function showMessage(type, text) {
        clearMessages();
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        authCard.insertBefore(div, authCard.querySelector('.tab-buttons'));
        setTimeout(() => {
            div.classList.add('fade-out');
            setTimeout(() => div.remove(), 300);
        }, 4000);
    }

    function setFormPending(form, isPending) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = isPending;
            submitButton.dataset.loading = String(isPending);
        }

        form.querySelectorAll('input, button').forEach(element => {
            if (element.type !== 'submit') {
                element.disabled = isPending;
            }
        });
    }

    function createPayload(formData, keys) {
        const payload = {};
        keys.forEach(key => {
            const value = formData.get(key);
            if (typeof value === 'string') {
                payload[key] = value.trim();
            }
        });
        return payload;
    }

    function setFooterState(state) {
        footerStates.forEach(p => {
            const isActive = p.getAttribute('data-state') === state;
            p.classList.toggle('hidden', !isActive);
        });
    }

    function activatePanel(targetPanel) {
        tabButtons.forEach(button => {
            const isActive = button.dataset.target === targetPanel;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });

        tabPanels.forEach(panel => {
            const isActive = panel.dataset.panel === targetPanel;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', String(!isActive));
        });

        setFooterState(targetPanel);
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            activatePanel(button.dataset.target);
        });
    });

    tabSwitchers.forEach(button => {
        button.addEventListener('click', () => {
            activatePanel(button.dataset.target);
        });
    });

    activatePanel('login');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        clearMessages();

        const formData = new FormData(loginForm);
        const payload = createPayload(formData, ['email', 'password']);

        if (!payload.email || !payload.password) {
            showMessage('error', 'Lütfen e-posta ve şifre alanlarını doldurun.');
            return;
        }

        setFormPending(loginForm, true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showMessage('success', 'Giriş başarılı! Yönlendiriliyorsunuz...');
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
                setTimeout(() => {
                    window.location.href = '/kayitlar';
                }, 1500);
            } else {
                const errorMessage = data.message || 'Giriş sırasında bir hata oluştu.';
                showMessage('error', errorMessage);
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('error', 'Sunucuya bağlanırken bir hata oluştu.');
        } finally {
            setFormPending(loginForm, false);
        }
    });

    registerForm.addEventListener('submit', async event => {
        event.preventDefault();
        clearMessages();

        const formData = new FormData(registerForm);
        const payload = createPayload(formData, ['name', 'email', 'password', 'confirmPassword']);

        if (!payload.name || !payload.email || !payload.password || !payload.confirmPassword) {
            showMessage('error', 'Lütfen tüm alanları doldurun.');
            return;
        }

        if (payload.password.length < 8) {
            showMessage('error', 'Şifreniz en az 8 karakter olmalıdır.');
            return;
        }

        if (payload.password !== payload.confirmPassword) {
            showMessage('error', 'Şifreler eşleşmiyor. Lütfen tekrar deneyin.');
            return;
        }

        setFormPending(registerForm, true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: payload.name,
                    email: payload.email,
                    password: payload.password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Kayıt işlemi başarısız oldu.');
            }

            showMessage('success', result.message || 'Kayıt işlemi başarılı. Giriş yapabilirsiniz.');
            registerForm.reset();
            activatePanel('login');
        } catch (error) {
            showMessage('error', error.message || 'Sunucuya ulaşılamadı.');
        } finally {
            setFormPending(registerForm, false);
        }
    });
    // NOTE: "Beni hatırla" ve "Şifremi unuttum" öğeleri kaldırıldı; JS tarafında referans bulunmadığından ek temizlik gerekmiyor.
});
