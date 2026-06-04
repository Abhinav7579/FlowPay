import { Worker } from "bullmq";
import redisConnection from "../config/redis.js";
import { transporter } from "../config/mailer.js";

const emailWorker = new Worker("emailQueue", async (job) => {
    const { email, name, subject, body } = job.data;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: `<h1>Hello ${name}</h1>
        <p>${body}</p>
      `,
    });

    console.log(`Email sent to ${email}`);
}, { connection: redisConnection });

export default emailWorker;
