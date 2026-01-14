const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const normalizeString = (value = '') => value.trim();
const normalizeEmail = (value = '') => value.trim().toLowerCase();

const register = async (req, res) => {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Lütfen ad soyad, e-posta ve şifre alanlarını doldurun.'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Şifreniz en az 8 karakter olmalıdır.'
        });
    }

    const fullName = normalizeString(name);
    const normalizedEmail = normalizeEmail(email);

    try {
        const [existingUser] = await db.execute(
            'SELECT id FROM kullanicilar WHERE e_mail = ? LIMIT 1',
            [normalizedEmail]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Bu e-posta adresi ile daha önce kayıt yapılmış.'
            });
        }

    // Hash the password before storing it
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.execute(
            'INSERT INTO kullanicilar (adi, e_mail, sifre) VALUES (?, ?, ?)',
            [fullName, normalizedEmail, hashedPassword]
        );

        return res.status(201).json({
            success: true,
            message: 'Kayıt işlemi başarılı. Giriş yapabilirsiniz.',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({
            success: false,
            message: 'Kayıt işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
        });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Lütfen e-posta ve şifre alanlarını doldurun.'
        });
    }

    const normalizedEmail = normalizeEmail(email);

    try {
        const [users] = await db.execute(
            'SELECT id, adi, e_mail, sifre FROM kullanicilar WHERE e_mail = ? LIMIT 1',
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'E-posta veya şifre hatalı.'
            });
        }

        const user = users[0];
        // Compare provided password with hashed password from DB
        const isPasswordValid = await bcrypt.compare(password, user.sifre);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'E-posta veya şifre hatalı.'
            });
        }

        const tokenPayload = {
            userId: user.id,
            role: 'Kullanıcı'
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: '12h'
        });

        return res.status(200).json({
            success: true,
            message: 'Giriş başarılı.',
            token,
            user: {
                id: user.id,
                name: user.adi,
                email: user.e_mail,
                role: 'Kullanıcı'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Giriş işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
        });
    }
};

module.exports = {
    register,
    login
};
