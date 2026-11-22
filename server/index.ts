const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Load a local .env file if present (no extra dependency needed).
// Existing environment variables from the host always take precedence.
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .forEach((line: string) => {
            const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
            if (match && process.env[match[1]] === undefined) {
                process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
            }
        });
}
const router = express.Router();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const compression = require('compression');

const app = express();
const port = 8080;

app.use(cors());
app.use(compression());

// Have Node serve the files for our built React app
app.use(express.static(path.resolve(__dirname, '../public')));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// Handle GET requests to /api route
app.post('/api/send-email', (req, res) => {
    const { name, company, email, message } = req.body;

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: process.env.FOLIO_EMAIL,
            pass: process.env.FOLIO_PASSWORD,
        },
    });

    transporter
        .verify()
        .then(() => {
            transporter
                .sendMail({
                    from: `"${name}" <${process.env.FOLIO_EMAIL}>`, // sender address
                    to: process.env.FOLIO_EMAIL || 'Mastereditor11@gmail.com', // list of receivers
                    subject: `${name} <${email}> ${
                        company ? `from ${company}` : ''
                    } submitted a contact form`, // Subject line
                    text: `${message}`, // plain text body
                })
                .then((info) => {
                    console.log({ info });
                    res.json({ message: 'success' });
                })
                .catch((e) => {
                    console.error(e);
                    res.status(500).send(e);
                });
        })
        .catch((e) => {
            console.error(e);
            res.status(500).send(e);
        });
});

// Warn early if the contact form cannot send email
if (!process.env.FOLIO_EMAIL || !process.env.FOLIO_PASSWORD) {
    console.warn(
        'Warning: FOLIO_EMAIL / FOLIO_PASSWORD are not set - the contact form will not send email.'
    );
}

// listen to app on port 8080
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
