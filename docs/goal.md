Đúng, vậy nên thiết kế HelpMe phải đổi trọng tâm.

**HelpMe = AI quản trị đời sống cá nhân**, giống một “personal operating system” có AI, tập trung vào:

```text
Lịch trình
Todo
Deadline
Nhắc việc
Ưu tiên công việc
Kế hoạch ngày / tuần / tháng
Theo dõi thói quen
Theo dõi mục tiêu
Tổng hợp trạng thái đời sống
Giao diện đẹp, dễ thao tác
```

Không nên bắt đầu bằng RAG tài liệu, security workflow, rule analysis. Những phần đó có thể để sau.

---

# 1. Định nghĩa lại HelpMe

HelpMe nên là một ứng dụng cá nhân có AI, không chỉ là chatbot.

Mô hình đúng hơn:

```text
HelpMe = Calendar + Todo + Deadline + Habit Tracker + AI Planner + Daily Assistant
```

Nhiệm vụ chính của HelpMe:

1. Biết hôm nay bạn có gì cần làm.
2. Biết việc nào quan trọng, việc nào gấp.
3. Biết deadline nào sắp tới.
4. Tự đề xuất lịch làm việc trong ngày.
5. Nhắc bạn khi bị quá tải hoặc quên việc.
6. Gom các việc rời rạc thành kế hoạch rõ ràng.
7. Có giao diện đẹp để bạn thật sự muốn dùng mỗi ngày.

---

# 2. Các kịch bản sử dụng chính

## Nhóm A — Quản lý ngày hôm nay

### A1. Morning Brief

Mỗi sáng mở HelpMe, hệ thống hiển thị:

```text
Good morning, Tuấn.

Today you have:
- 3 tasks due today
- 1 deadline in 2 days
- 2 calendar events
- 1 overdue task

Suggested focus:
1. Finish AWS lab guide revision
2. Review certificate study notes
3. Workout 30 minutes
```

AI có thể nói:

> Hôm nay bạn nên ưu tiên việc “xong lab UC-45” vì nó vừa gần deadline, vừa ảnh hưởng đến task tiếp theo.

---

### A2. AI lập kế hoạch ngày

Bạn nhập:

> Hôm nay tôi rảnh từ 20:00 đến 23:00, giúp tôi sắp xếp việc.

HelpMe trả về:

```text
20:00 - 20:15: Review todo
20:15 - 21:30: Work on highest priority task
21:30 - 21:40: Break
21:40 - 22:30: Study AWS Security
22:30 - 22:50: Quick cleanup / notes
22:50 - 23:00: Prepare tomorrow
```

Tính năng cần có:

| Thành phần      | Vai trò                    |
| --------------- | -------------------------- |
| Calendar        | Biết khung giờ rảnh        |
| Task priority   | Biết việc nào quan trọng   |
| Deadline engine | Biết việc nào gấp          |
| AI planner      | Sắp lịch hợp lý            |
| Time block UI   | Hiển thị dạng timeline đẹp |

---

### A3. Evening Review

Cuối ngày HelpMe hỏi:

```text
Hôm nay bạn đã hoàn thành gì?
Có việc nào cần dời sang ngày mai?
Mức năng lượng hôm nay thế nào?
```

Bạn trả lời tự nhiên:

> Xong được lab UC-45, chưa học AWS, hơi mệt.

HelpMe tự cập nhật:

```text
Completed:
- Lab UC-45

Rescheduled:
- AWS study → Tomorrow 20:00

Energy:
- Low
```

---

## Nhóm B — Todo thông minh

### B1. Thêm task bằng ngôn ngữ tự nhiên

Bạn nhập:

> Nhắc tôi tối mai lúc 8h học AWS Security Specialty trong 1 tiếng.

HelpMe tự parse:

```json
{
  "title": "Học AWS Security Specialty",
  "date": "tomorrow",
  "time": "20:00",
  "duration": 60,
  "type": "study",
  "reminder": true
}
```

---

### B2. Tạo task từ câu nói mơ hồ

Bạn nhập:

> Cuối tuần này nhớ xem lại lộ trình học AWS.

HelpMe tạo:

```text
Task: Review AWS learning roadmap
Due: Sunday
Priority: Medium
Category: Learning
```

---

### B3. Tự chia nhỏ task lớn

Bạn nhập:

> Tôi cần hoàn thành báo cáo thiết kế HelpMe.

AI hỏi hoặc tự đề xuất breakdown:

```text
Project: HelpMe Design Report

Subtasks:
1. Define use cases
2. Design information architecture
3. Choose tech stack
4. Design UI screens
5. Write MVP roadmap
6. Export report
```

---

## Nhóm C — Deadline management

### C1. Deadline radar

HelpMe có màn hình:

```text
Upcoming Deadlines

Today:
- Submit AWS lab guide

Next 3 days:
- Finish AWS study plan
- Review Part 3 workbook

Next 7 days:
- Prepare report
```

AI đánh dấu:

| Mức    | Ý nghĩa              |
| ------ | -------------------- |
| Red    | Quá hạn hoặc rất gấp |
| Orange | Sắp tới hạn          |
| Yellow | Cần bắt đầu sớm      |
| Green  | Còn thoải mái        |

---

### C2. Cảnh báo quá tải

Nếu trong một ngày có quá nhiều task, HelpMe nói:

```text
Bạn đang có 7 task trong tối nay, tổng ước tính 5.5 giờ,
nhưng bạn chỉ có khoảng 3 giờ rảnh.

Đề xuất:
- Giữ lại 3 task quan trọng
- Dời 2 task sang ngày mai
- Hủy hoặc giảm scope 2 task thấp ưu tiên
```

Đây là điểm AI rất có giá trị: không chỉ ghi việc, mà còn **phân tích tính khả thi**.

---

## Nhóm D — Calendar thông minh

### D1. Time blocking

Bạn có danh sách task:

```text
- Học AWS 1h
- Viết báo cáo 2h
- Workout 30m
- Đọc sách 30m
```

HelpMe tự xếp vào lịch dựa trên thời gian trống.

---

### D2. Reschedule tự động

Bạn nói:

> Hôm nay tôi mệt, dời các task không gấp sang ngày mai.

HelpMe phân loại:

```text
Keep today:
- Deadline due today

Move tomorrow:
- Study AWS
- Read philosophy
- Clean notes
```

---

### D3. Focus session

Bạn bấm “Start Focus”.

HelpMe tạo phiên:

```text
Focus: Write HelpMe design
Duration: 50 minutes
Break: 10 minutes
Mode: Deep work
```

Sau phiên, hệ thống hỏi:

```text
Bạn có hoàn thành không?
Có cần tạo task follow-up không?
```

---

## Nhóm E — Habit & routine

### E1. Theo dõi thói quen

Ví dụ:

```text
Habits:
- Workout
- Read 20 pages
- Study AWS
- Sleep before 00:00
- Review daily plan
```

AI không chỉ tick thói quen, mà còn nhận xét:

```text
Bạn học AWS được 4/7 ngày tuần này.
Workout chỉ đạt 1/3 buổi.
Có vẻ các ngày bạn làm việc muộn thì workout thường bị bỏ.
```

---

### E2. Routine builder

Bạn nhập:

> Tạo cho tôi routine buổi tối 30 phút.

HelpMe đề xuất:

```text
22:30 - 22:35: Clear desk
22:35 - 22:45: Review today
22:45 - 22:55: Plan tomorrow
22:55 - 23:00: Wind down
```

---

## Nhóm F — Goal management

### F1. Quản lý mục tiêu lớn

Ví dụ:

```text
Goal: Pass AWS Security Specialty
Deadline: 2026-09-30
Weekly target: 10 hours
Current progress: 23%
```

HelpMe tự nối Goal → Project → Task → Daily Plan.

```text
Goal
└── Project
    └── Milestone
        └── Task
            └── Calendar block
```

---

### F2. AI kiểm tra tiến độ

Bạn hỏi:

> Tôi có đang đi đúng tiến độ học AWS không?

HelpMe phân tích:

```text
Bạn đặt mục tiêu 10h/tuần.
Tuần này mới hoàn thành 3h.
Bạn đang chậm khoảng 7h.

Đề xuất:
- Thứ 6: 2h
- Thứ 7: 3h
- Chủ nhật: 2h
```

---

# 3. Các nội dung có cần có cho người dùng xem được
Xem được không có nghĩa là lúc nào cũng show ra.

## 3.1. Home Dashboard


## 3.2. Today View

Dạng timeline:

```text
08:00 ─ Morning routine
09:00 ─ Work
12:00 ─ Lunch
20:00 ─ Study AWS
21:00 ─ Write report
22:30 ─ Review day
```

Có kéo-thả task vào khung giờ.

---

## 3.3. Task Inbox

Nơi gom mọi việc chưa xử lý.

```text
Inbox
- Read AWS whitepaper
- Fix lab UC-45
- Buy notebook
- Review HelpMe UI idea
```

AI có nút:

```text
[Organize Inbox]
```

Sau khi bấm, AI phân loại:

```text
Learning:
- Read AWS whitepaper

Work:
- Fix lab UC-45

Personal:
- Buy notebook

Project:
- Review HelpMe UI idea
```

---

## 3.4. Calendar View

Có 3 chế độ:

| View  | Dùng để              |
| ----- | -------------------- |
| Day   | Lập kế hoạch hôm nay |
| Week  | Cân bằng workload    |
| Month | Nhìn deadline lớn    |

---

## 3.5. Deadline Radar

Một màn hình chuyên cho deadline:

```text
Overdue
- Submit report

Due Today
- Review AWS lab

This Week
- Study module 3
- Prepare workbook

Later
- Certification exam
```

---

## 3.6. AI Chat Panel

AI phải có khả năng thao tác vào dữ liệu app:

# 4. Các entity dữ liệu cốt lõi

## 4.1. Task

```ts
type Task = {
  id: string
  title: string
  description?: string
  status: "inbox" | "todo" | "doing" | "done" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: string
  scheduledStart?: string
  scheduledEnd?: string
  estimatedMinutes?: number
  projectId?: string
  goalId?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}
```

---

## 4.2. Event

```ts
type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  location?: string
  source: "manual" | "google_calendar" | "ai_generated"
  linkedTaskId?: string
}
```

---

## 4.3. Deadline

```ts
type Deadline = {
  id: string
  title: string
  dueDate: string
  severity: "normal" | "important" | "critical"
  relatedTaskIds: string[]
  status: "open" | "done" | "missed"
}
```

---

## 4.4. Habit

```ts
type Habit = {
  id: string
  title: string
  frequency: "daily" | "weekly" | "custom"
  targetCount: number
  streak: number
  logs: HabitLog[]
}
```

---

## 4.5. Goal

```ts
type Goal = {
  id: string
  title: string
  description?: string
  deadline?: string
  progress: number
  status: "active" | "paused" | "completed"
}
```

---

# 5. AI nên làm gì trong HelpMe?

AI không nên chỉ trả lời văn bản. AI nên có quyền đề xuất hoặc tạo thay đổi có kiểm soát.

## 5.1. AI Intent Parser

Người dùng nói:

> Nhắc tôi thứ 6 tuần này nộp báo cáo.

AI parse thành action:

```json
{
  "action": "create_task",
  "task": {
    "title": "Nộp báo cáo",
    "dueDate": "Friday",
    "priority": "high",
    "reminder": true
  }
}
```

---

## 5.2. AI Planner

Input:

```json
{
  "availableTime": "20:00-23:00",
  "tasks": [
    {"title": "Study AWS", "estimate": 60, "priority": "high"},
    {"title": "Write report", "estimate": 90, "priority": "urgent"},
    {"title": "Workout", "estimate": 30, "priority": "medium"}
  ]
}
```

Output:

```json
{
  "plan": [
    {"time": "20:00-21:30", "task": "Write report"},
    {"time": "21:30-21:40", "task": "Break"},
    {"time": "21:40-22:40", "task": "Study AWS"},
    {"time": "22:40-23:00", "task": "Quick review"}
  ]
}
```

---

## 5.3. AI Prioritizer

Tính điểm ưu tiên dựa trên:

```text
Priority score =
deadline urgency
+ user priority
+ estimated effort
+ dependency
+ goal importance
+ overdue penalty
```

Ví dụ:

| Task          | Deadline | Importance | Score |
| ------------- | -------: | ---------: | ----: |
| Submit report |    Today |       High |    95 |
| Study AWS     |   3 days |       High |    75 |
| Read book     |     None |     Medium |    35 |

---

## 5.4. AI Reflection

Cuối ngày:

```text
Bạn hoàn thành 4/6 task.
Bạn bỏ qua workout lần thứ 3 trong tuần.
Các task bị trễ chủ yếu nằm ở buổi tối sau 22:00.
Đề xuất: đưa workout lên trước 21:00 hoặc giảm còn 15 phút.
```

---





# 9. Local model nên dùng cho HelpMe

Với app quản trị đời sống, model không cần quá lớn như coding/reasoning nặng. Quan trọng là:

```text
- Hiểu tiếng Việt tốt
- Parse task/deadline tốt
- Output JSON ổn
- Chạy nhanh
- Ít tốn RAM
```

Khuyến nghị:

| Vai trò          | Model                                  |
| ---------------- | -------------------------------------- |
| Fast parser      | Qwen 2.5/3 3B hoặc Llama 3.2 3B        |
| Main assistant   | Qwen 3/3.5 4B                          |
| Planning tốt hơn | Qwen 7B/8B quantized nếu máy chịu được |
| Embedding        | Không bắt buộc ở MVP                   |

Với HelpMe Life Admin, RAG không phải trọng tâm ban đầu. Quan trọng hơn là **structured output**.

Ví dụ model cần trả ra JSON:

```json
{
  "intent": "create_task",
  "title": "Học AWS Security Specialty",
  "dueDate": "2026-06-05",
  "time": "20:00",
  "estimatedMinutes": 60,
  "priority": "medium"
}
```

---

# 10. Module hệ thống HelpMe

## 10.1. Task Manager

Chức năng:

```text
- Create task
- Edit task
- Complete task
- Reschedule task
- Break down task
- Set priority
- Link task to goal/project
```

---

## 10.2. Calendar Manager

Chức năng:

```text
- Day/week/month view
- Time blocking
- Drag and drop task
- Recurring events
- Free time detection
- Calendar conflict warning
```

---

## 10.3. Deadline Manager

Chức năng:

```text
- Deadline radar
- Overdue detection
- Upcoming deadline summary
- Urgency score
- Reminder generation
```

---

## 10.4. AI Planner

Chức năng:

```text
- Plan my day
- Plan my week
- Reschedule unfinished tasks
- Detect overload
- Recommend focus block
- Create realistic schedule
```

---

## 10.5. Habit Tracker

Chức năng:

```text
- Daily habit check-in
- Weekly habit review
- Streak
- Completion rate
- AI insight
```

---

## 10.6. Notification Engine

Chức năng:

```text
- Reminder before deadline
- Reminder before scheduled task
- Daily morning brief
- Evening review
- Overdue alert
```

---

## 10.7. AI Chat Command

Không phải chatbot chung chung, mà là command layer.

Ví dụ:

```text
"Thêm task học AWS tối mai"
"Dời task chưa xong sang ngày mai"
"Lập kế hoạch tuần này"
"Tôi chỉ có 2 tiếng tối nay, nên làm gì?"
"Deadline nào sắp tới?"
"Việc nào đang bị trễ?"
```

---

# 11. UI design direction

Tôi đề xuất phong cách:

```text
Minimal
Calm
Dark mode đẹp
Card-based dashboard
Timeline rõ ràng
Không quá nhiều bảng
Ít màu nhưng dùng màu có ý nghĩa
```

# 15. Luồng AI tạo task

```text
User input:
"Nhắc tôi tối mai 8h học AWS 1 tiếng"

        │
        ▼

AI intent parser:
{
  action: "create_task",
  title: "Học AWS",
  date: "tomorrow",
  time: "20:00",
  duration: 60
}

        │
        ▼

Backend validate date/time

        │
        ▼

Create task in SQLite

        │
        ▼

Create reminder

        │
        ▼

Show task on Today/Calendar
```

---

# 16. Luồng AI plan my day

```text
User:
"Hôm nay tôi rảnh từ 20h đến 23h, sắp lịch giúp tôi"

        │
        ▼

Backend lấy:
- tasks open
- deadlines
- calendar events
- estimated duration
- priority

        │
        ▼

AI planner tạo plan

        │
        ▼

Backend validate:
- không trùng giờ
- không vượt available time
- task có tồn tại

        │
        ▼

User confirm

        │
        ▼

Apply to calendar
```

---

# 17. Điểm khác biệt quan trọng

HelpMe không nên giống Todoist clone thông thường.

Nó nên khác ở chỗ:

| Todo app thường             | HelpMe                              |
| --------------------------- | ----------------------------------- |
| Bạn tự nhập mọi thứ         | AI hiểu ngôn ngữ tự nhiên           |
| Chỉ lưu task                | Biết deadline, effort, overload     |
| Không biết bạn mệt          | Có daily review/energy              |
| Không tự lập lịch           | Có AI time blocking                 |
| Không giải thích ưu tiên    | Có reasoning vì sao task quan trọng |
| Không nhìn mục tiêu dài hạn | Nối task với goal                   |

---



