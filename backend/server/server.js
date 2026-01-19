const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const port = 3001;

app.use(express.static(path.join(__dirname, '../../'))); 
app.use('/src', express.static(path.join(__dirname, '../../src'))); 

const JWT_SECRET = 'your-super-secret-key-for-jwt';

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'business_plan',
    password: 'postgres', 
    port: 5432,
});

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Имя, email и пароль обязательны' });
    }

    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
            [uuidv4(), name, email, hashedPassword]
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: newUser.rows[0],
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email и пароль обязательны' });
    }

    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        return res.sendStatus(401); 
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); 
        }
        req.user = user;
        next();
    });
};

app.get('/api/features', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT key, label, dev_hours, design_hours FROM features ORDER BY id');
        
        const featuresObject = rows.reduce((acc, feature) => {
            acc[feature.key] = {
                label: feature.label,
                devHours: feature.dev_hours,
                designHours: feature.design_hours
            };
            return acc;
        }, {});

        res.json(featuresObject);
    } catch (error) {
        console.error('Ошибка при получении списка фич:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении фич' });
    }
});

app.get('/api/technologies', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT key, label, category FROM technologies ORDER BY category, id');
        
        const technologiesGrouped = rows.reduce((acc, tech) => {
            const { category, key, label } = tech;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push({ key, label });
            return acc;
        }, {});

        res.json(technologiesGrouped);
    } catch (error) {
        console.error('Ошибка при получении списка технологий:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении технологий' });
    }
});

app.get('/api/roles', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT key, label, category FROM roles ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('Ошибка при получении списка ролей:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении ролей' });
    }
});


app.post('/api/plans', authenticateToken, async (req, res) => {
    const { userId } = req.user; 
    const planData = req.body;

    if (!planData || !planData.general || !planData.general.name) {
        return res.status(400).json({ message: 'Некорректные данные плана или отсутствует название проекта' });
    }

    try {
        const newPlan = await pool.query(
            `INSERT INTO business_plans (id, user_id, project_name, plan_data)
             VALUES ($1, $2, $3, $4)
             RETURNING id, project_name, created_at`,
            [uuidv4(), userId, planData.general.name, JSON.stringify(planData)]
        );

        res.status(201).json({
            message: 'Бизнес-план успешно сохранен',
            plan: newPlan.rows[0],
        });

    } catch (error) {
        console.error('Ошибка при сохранении бизнес-плана:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при сохранении плана' });
    }
});

app.get('/api/plans', authenticateToken, async (req, res) => {
    const { userId } = req.user;

    try {
        const { rows } = await pool.query(
            'SELECT id, project_name, plan_data, updated_at FROM business_plans WHERE user_id = $1 ORDER BY updated_at DESC',
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Ошибка при получении списка планов:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении планов' });
    }
});

app.put('/api/plans/:id', authenticateToken, async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;
    const planData = req.body;

    if (!planData || !planData.general || !planData.general.name) {
        return res.status(400).json({ message: 'Некорректные данные плана' });
    }

    try {
        const updatedPlan = await pool.query(
            `UPDATE business_plans SET project_name = $1, plan_data = $2, updated_at = NOW()
             WHERE id = $3 AND user_id = $4
             RETURNING id, project_name, updated_at`,
            [planData.general.name, JSON.stringify(planData), id, userId]
        );

        if (updatedPlan.rowCount === 0) {
            return res.status(404).json({ message: 'План не найден или у вас нет прав на его редактирование' });
        }

        res.json({ message: 'Бизнес-план успешно обновлен', plan: updatedPlan.rows[0] });
    } catch (error) {
        console.error('Ошибка при обновлении бизнес-плана:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при обновлении плана' });
    }
});

app.delete('/api/plans/:id', authenticateToken, async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    try {
        const deleteOp = await pool.query(
            'DELETE FROM business_plans WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (deleteOp.rowCount === 0) {
            return res.status(404).json({ message: 'План не найден или у вас нет прав на его удаление' });
        }

        res.status(200).json({ message: 'Бизнес-план успешно удален' });
    } catch (error) {
        console.error('Ошибка при удалении бизнес-плана:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при удалении плана' });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});