const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,

    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

const sendEmail = async (to, subject, html) => {

    const info = await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to,
        subject,
        html
    });

    console.log("📧 Email sent successfully:", info.messageId);

    return info;
};

module.exports = {
    sendEmail
};
transporter.verify((error, success) => {

    if (error) {
        console.error("❌ SMTP Verification Failed:");
        console.error(error.message);
    } else {
        console.log("✅ SMTP Server Ready");
    }

});