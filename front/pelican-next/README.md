# Pelican University Hub

A centralized web application designed to help university students organize their academic and extracurricular lives. The core vision is to "make the most of your university experience" by consolidating deadlines, tasks, and events into a single, intuitive dashboard.

## 🎯 Features

### ✅ Implemented (MVP)
- **Dashboard Interface**: Central hub with task overview and statistics
- **Smart Task Management**: Organize deadlines with priority sorting and due date tracking
- **Interactive Task Details**: Modal dialogs with complete task information
- **Responsive Design**: Mobile-first design that works on all devices
- **Modern UI Components**: Clean, minimalist design with Pelican brand colors
- **Navigation System**: Sidebar navigation with authentication layouts

### 🚧 Coming Soon
- **Syllabus Extraction**: AI-powered PDF parsing to automatically extract deadlines
- **Calendar View**: Visual calendar interface for all deadlines and events
- **Community Features**: Study groups, discussions, and resource sharing
- **Authentication**: User registration, login, and session management
- **Event Management**: Track club meetings, workshops, and academic events

## 🎨 Design System

### Colors
- **Primary (Pelican Orange)**: `#F9A826` - Main brand color for CTAs and highlights
- **Secondary (Sky Blue)**: `#3B82F6` - Secondary actions and accents
- **Success (Soft Green)**: `#28A745` - Completion states and positive actions
- **Danger (Soft Red)**: `#DC3545` - Destructive actions and warnings
- **Background**: `#F8F9FA` - Main content background
- **Card Background**: `#FFFFFF` - Clean white for content cards
- **Text Primary**: `#343A40` - Main text color
- **Text Secondary**: `#CED4DA` - Subtitles and borders

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

## 🛠 Tech Stack

- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **State Management**: React useState/useEffect (Context/Zustand planned)
- **Build Tool**: Turbopack

## 📁 Project Structure

```
pelican-next/
├── app/
│   ├── dashboard/          # Main dashboard page
│   ├── calendar/           # Calendar view (placeholder)
│   ├── community/          # Community features (placeholder)
│   ├── feedback/           # User feedback page
│   ├── login/              # Authentication login
│   ├── register/           # User registration
│   ├── globals.css         # Global styles and design system
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/
│   ├── auth-layout.tsx     # Authentication pages layout
│   ├── dashboard-layout.tsx # Main app layout with sidebar
│   ├── info-card.tsx       # Reusable card component
│   ├── sidebar.tsx         # Navigation sidebar
│   ├── task-detail-modal.tsx # Task details modal
│   ├── task-item.tsx       # Individual task component
│   └── index.ts            # Component exports
├── lib/
│   ├── types.ts            # TypeScript interfaces
│   ├── utils.ts            # Utility functions
│   └── mock-data.ts        # Development mock data
└── public/                 # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pelican-next
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production bundle
- `npm run start` - Start production server

## 📱 Navigation

### Current Routes
- `/` - Landing page with feature overview
- `/dashboard` - Main dashboard (functional)
- `/calendar` - Calendar view (placeholder)
- `/community` - Community features (placeholder)
- `/feedback` - User feedback form (functional)
- `/login` - User login (UI only)
- `/register` - User registration (UI only)

## 🎯 Usage

### Dashboard Features
1. **Upcoming Deadlines**: View tasks due in the next 7 days
2. **To-Do List**: All incomplete tasks with priority sorting
3. **Upcoming Events**: Academic and extracurricular events
4. **Task Interaction**: Click any task to view detailed information
5. **Quick Stats**: Overview of completion rates and task counts

### Task Management
- Tasks show due dates with urgency color coding
- Course information and syllabus extraction indicators
- Complete tasks or remove them via the detail modal
- Responsive design works on mobile and desktop

## 🔧 Development

### Adding New Features
1. Create components in `/components/`
2. Add TypeScript interfaces in `/lib/types.ts`
3. Update navigation in `/components/sidebar.tsx`
4. Create new pages in `/app/[route]/page.tsx`

### Design Guidelines
- Follow the established color palette
- Use consistent spacing (Tailwind CSS classes)
- Maintain mobile-first responsive design
- Keep components reusable and well-typed

## 🤝 Contributing

This project follows the product design document specifications. When contributing:

1. Follow the established design system
2. Maintain TypeScript strict mode
3. Use consistent naming conventions
4. Add proper error handling
5. Test on mobile and desktop

## 📋 TODO

### High Priority
- [ ] Implement real authentication with NextAuth.js
- [ ] Add database integration (PostgreSQL/Supabase)
- [ ] Create API routes for CRUD operations
- [ ] Implement syllabus PDF parsing

### Medium Priority
- [ ] Build calendar view component
- [ ] Add user profile management
- [ ] Implement push notifications
- [ ] Create community features

### Low Priority
- [ ] Add dark mode support
- [ ] Implement offline functionality
- [ ] Add data export features
- [ ] Create mobile app version

## 🎓 Project Context

Pelican is designed specifically for university students to help them:
- Track academic deadlines across multiple courses
- Manage personal and academic tasks
- Discover and participate in campus events
- Build study communities
- Reduce cognitive load through automation

The application prioritizes clean design, ease of use, and intelligent features that adapt to student needs.

---

**Built with ❤️ for university students**
