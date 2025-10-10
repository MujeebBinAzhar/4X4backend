const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Set SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// General function to send emails
const sendEmail = async ({ to, subject, html }) => {
    try {
        const msg = {
            to,
            from: 'gurujee256@gmail.com', // Set your verified sender email
            subject,
            html,
        };
        await sgMail.send(msg);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error.response ? error.response.body : error);
    }
};

// Function to send Account Created email
const accountCreated = async (to,
        name,password
) => {
    const filePath = path.join(__dirname, '../templates', 'acc-created.html');
    console.log(filePath)
    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            console.error('Error loading the email template');
            return;
        }
        const html = data.replace('{{name}}', name).replace("{{password}}", password).replace("{{email}}", to);
        await sendEmail({ to, subject: 'Welcome to Our Platform!', html });
    });
};

// Function to send Password Reset email
const passwordReset = async (to, resetLink) => {
    const filePath = path.join(__dirname, 'views', 'passwordReset.html');
    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            console.error('Error loading the email template');
            return;
        }
        const html = data.replace('{{resetLink}}', resetLink);
        await sendEmail({ to, subject: 'Password Reset Request', html });
    });
};

// Function to send Order Confirmation email
const orderRecieved = async (to, name, orderItems, shippingCharges, totalAmount) => {
    const filePath = path.join(__dirname, '../templates', 'order-recieved.html');

    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            console.error('Error loading the email template');
            return;
        }

        // Map order items to table rows
        const orderItemsHTML = orderItems.map(item => `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #ddd;">${item.name}</td>
                <td style="padding:8px;border-bottom:1px solid #ddd;">${item.quantity}</td>
                <td style="padding:8px;border-bottom:1px solid #ddd;">$${item.price}</td>
            </tr>
        `).join('');

        // Replace placeholders with actual data
        const html = data
            .replace('{{name}}', name)
            .replace('{{orderItems}}', orderItemsHTML)
            .replace('{{shippingCharges}}', shippingCharges)
            .replace('{{totalAmount}}', totalAmount);

        await sendEmail({ to, subject: `Order Confirmation - ${name}`, html });
    });
};

// Function to send Payment Received email
const paymentReceived = async (to, name, orderId, amountPaid, paymentMethod, orderItems, shippingCharges, totalAmount) => {
    const filePath = path.join(__dirname, '../templates', 'payment-recieved.html');
    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            console.error('Error loading the email template');
            return;
        }

        const orderItemsHTML = orderItems.map(item => `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #ddd;">${item.name}</td>
                <td style="padding:8px;border-bottom:1px solid #ddd;">${item.quantity}</td>
                <td style="padding:8px;border-bottom:1px solid #ddd;">$${item.price}</td>
            </tr>
        `).join('');

        const html = data
            .replace('{{name}}', name)
            .replace('{{orderId}}', orderId)
            .replace('{{amountPaid}}', amountPaid)
            .replace('{{paymentMethod}}', paymentMethod)
            .replace('{{orderItems}}', orderItemsHTML)
            .replace('{{shippingCharges}}', shippingCharges)
            .replace('{{totalAmount}}', totalAmount);

        await sendEmail({ to, subject: `Payment Received - Order ${orderId}`, html });
    });
};


// Function to send Low Stock Alert email to Admin
const lowStockAlert = async (to, productName, currentStock) => {
    const subject = `Low Stock Alert: ${productName}`;
    const text = `Dear Admin,

The product "${productName}" has reached its minimum stock threshold.
Current Stock: ${currentStock}

Please take necessary action to restock.

Best Regards,
Inventory Management System`;
    await sendEmail({ to, subject, html: `<pre>${text}</pre>` });
};


// Export the functions
module.exports = { accountCreated, passwordReset, orderRecieved, paymentReceived, lowStockAlert };
