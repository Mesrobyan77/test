const bcrypt = require('bcrypt');
const { pool } = require('../model/db');

// Register User
// {
//     "first_name":"userName", 
//     "last_name":"LastName", 
//     "age":29, 
//     "password":"passord", 
//     "email":"exaple@inbox.ru"
// }
const register = async (req, res) => {
    try {
        const { first_name, last_name, age, email, password } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        console.log('Email:', email);
        
        try {
            const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

            console.log('User Exists:', userExists.rows);  
            
            if (userExists.rows.length > 0) {
                return res.status(400).json({ message: 'Email already in use' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await pool.query(
                `INSERT INTO users (first_name, last_name, age, password, email) 
                VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
                [first_name, last_name, age, hashedPassword, email]
            );

            return res.status(201).json({ message: "User registered successfully", user: result.rows[0] });
        } catch (dbError) {
            console.error('Database Error:', dbError.message);
            console.error('Database Stack:', dbError.stack);
            return res.status(500).json({ message: 'Database Error', error: dbError.message });
        }
    } catch (error) {
        console.error('Registration Error:', error.message);
        console.error('Stack Trace:', error.stack);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};



// Login User
// {
//     "password":"password", 
//     "email":"example@inbox.ru"
// }
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log(email, password);

        const result = await pool.query('SELECT id, email, password FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(isMatch);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        req.session.user = { id: user.id, email: user.email };

        return res.status(200).json({ message: "Login successful", user: req.session.user });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


module.exports = { register, login };
