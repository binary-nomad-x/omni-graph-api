## Important Infos

### Kill process running on port 4000

```sh
(Get-NetTCPConnection -LocalPort 4000).OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### setup the queue connection

Bilkul. BullMQ ka proper flow hota hai:

> **Producer** → Queue → Redis → Worker → Mail Service

Abhi tum queue mein job add kar rahe ho lekin usko process karne wala **Worker** hi nahi hai.

Main simple production structure bata raha hoon.

```
src/
│
├── redis.ts
├── queues/
│     email.queue.ts
│
├── workers/
│     email.worker.ts
│
├── services/
│     mail.service.ts
│
└── index.ts
```

---

# 1) Redis Connection

```ts
// src/redis.ts

import { Redis } from "ioredis";

export const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});
```

---

# 2) Email Queue

```ts
// src/queues/email.queue.ts

import { Queue } from "bullmq";
import { redisConnection } from "../redis.js";

export const emailQueue = new Queue("email-queue", {
  connection: redisConnection,
});
```

Ab project mein kahin bhi

```ts
import { emailQueue } from "../queues/email.queue.js";
```

kar sakte ho.

---

# 3) deleteUser()

Pehle user delete mat karo.

Email chahiye.

Isliye pehle user nikalo.

```ts
async deleteUser(userId: string | undefined, id: string) {

    requireOwner(id, userId);

    const user = await this.core.user.findUnique({
        where: {
            id,
        },
    });

    if (!user) {
        throw new Error("User not found");
    }

    await this.core.user.delete({
        where: {
            id,
        },
    });

    await emailQueue.add(
        "user.deleted",
        {
            email: user.email,
            name: user.name,
        },
        {
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: false,
        }
    );

    return true;
}
```

---

# 4) Worker

```ts
// src/workers/email.worker.ts

import { Worker } from "bullmq";
import { redisConnection } from "../redis.js";
import { MailService } from "../services/mail.service.js";

export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    switch (job.name) {
      case "user.deleted":
        await MailService.sendDeletedEmail(job.data.email, job.data.name);

        break;
    }
  },
  {
    connection: redisConnection,
  },
);
```

---

# 5) Mail Service

Abhi sample bana dete hain.

```ts
// src/services/mail.service.ts

export class MailService {
  static async sendDeletedEmail(email: string, name?: string) {
    console.log("==============");

    console.log("Send Mail");

    console.log(email);

    console.log(name);

    console.log("==============");
  }
}
```

Baad mein yahan Nodemailer / Resend / SES / SMTP laga dena.

---

# 6) Worker ko start karna

`index.ts`

```ts
import "./workers/email.worker.js";
```

Bas.

Worker background mein listening start kar dega.

---

# 7) Agar queue monitor karna ho

Install

```bash
npm install @bull-board/api @bull-board/express
```

phir browser mein

```
localhost:3000/admin/queues
```

Aur sari jobs live dekh sakte ho.

---

# Final Flow

```
deleteUser()

        │

        ▼

User DB se delete

        │

        ▼

emailQueue.add()

        │

        ▼

Redis

        │

        ▼

BullMQ Worker

        │

        ▼

MailService

        │

        ▼

SMTP / Resend / SES
```

## Ek aur suggestion (Production)

Main **har type ki job ke liye alag queue** nahi banata. Main ek reusable queue system banata hoon:

```
src/
    queues/
        index.ts
        email.queue.ts

    jobs/
        SendDeletedEmailJob.ts
        SendWelcomeEmailJob.ts
        ResetPasswordJob.ts
        ExportUsersJob.ts

    workers/
        email.worker.ts
```

Phir sirf:

```ts
await SendDeletedEmailJob.dispatch(user);
```

- generating log is incorrect
- review novu syncing process carefully
- try to pull all templates and replace all the locals and vice versa
- try build the novu cli for in-depth demo

Aur internally woh BullMQ ko call karta hai. Ye Laravel ke `dispatch()` jaisa API deta hai aur project kaafi clean aur scalable ho jata hai.
