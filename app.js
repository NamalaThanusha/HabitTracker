class HabitTracker {
    constructor() {
        this.storageKeys = {
            habits: 'habits',
            theme: 'habitTrackerTheme',
        };

        this.habits = this.loadHabits();
        this.theme = this.loadTheme();
        this.applyTheme(this.theme);
        this.normalizeHabitsForToday();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        const addBtn = document.getElementById('addBtn');
        const habitInput = document.getElementById('habitInput');
        const themeToggle = document.getElementById('themeToggle');

        addBtn.addEventListener('click', () => this.addHabit());
        habitInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.addHabit();
            }
        });

        themeToggle.addEventListener('click', () => this.toggleTheme());

        document.getElementById('habitsList').addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-action]');
            const card = event.target.closest('[data-habit-id]');

            if (!actionButton || !card) return;

            const { action } = actionButton.dataset;
            const habitId = card.dataset.habitId;

            if (action === 'done') {
                this.markHabitDone(habitId);
            }

            if (action === 'delete') {
                this.deleteHabit(habitId);
            }
        });
    }

    addHabit() {
        const input = document.getElementById('habitInput');
        const habitName = input.value.trim().replace(/\s+/g, ' ');

        if (!habitName) {
            alert('Please enter a habit name.');
            return;
        }

        const normalizedName = this.normalizeHabitName(habitName);
        const isDuplicate = this.habits.some((habit) => habit.normalizedName === normalizedName);

        if (isDuplicate) {
            alert('That habit already exists.');
            return;
        }

        this.habits.push({
            id: String(Date.now()),
            name: habitName,
            normalizedName,
            emoji: this.getEmojiForHabit(habitName),
            streak: 0,
            lastCompletedDate: null,
            completedToday: false,
            createdAt: new Date().toISOString(),
        });

        this.saveHabits();
        this.render();

        input.value = '';
        input.focus();
    }

    deleteHabit(id) {
        const habit = this.habits.find((item) => item.id === id);

        if (!habit) return;

        const confirmDelete = confirm(`Delete "${habit.name}"?`);
        if (!confirmDelete) return;

        this.habits = this.habits.filter((item) => item.id !== id);
        this.saveHabits();
        this.render();
    }

    markHabitDone(id) {
        const habit = this.habits.find((item) => item.id === id);
        if (!habit || habit.completedToday) return;

        const today = this.getDateString(new Date());
        const yesterday = this.getDateString(this.getRelativeDate(-1));

        habit.streak = habit.lastCompletedDate === yesterday ? habit.streak + 1 : 1;
        habit.completedToday = true;
        habit.lastCompletedDate = today;

        this.saveHabits();
        this.render();
        this.flashCompletedHabit(id);
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.theme);
        localStorage.setItem(this.storageKeys.theme, this.theme);
    }

    applyTheme(theme) {
        document.body.dataset.theme = theme;
        const themeToggleIcon = document.getElementById('themeToggleIcon');
        const themeToggleText = document.getElementById('themeToggleText');

        if (themeToggleIcon && themeToggleText) {
            if (theme === 'dark') {
                themeToggleIcon.textContent = '🌙';
                themeToggleText.textContent = 'Dark mode';
            } else {
                themeToggleIcon.textContent = '☀️';
                themeToggleText.textContent = 'Light mode';
            }
        }
    }

    render() {
        this.updateStats();
        this.renderHabits();
    }

    updateStats() {
        const totalHabits = this.habits.length;
        const completedToday = this.habits.filter((habit) => habit.completedToday).length;

        document.getElementById('totalHabits').textContent = totalHabits;
        document.getElementById('completedToday').textContent = completedToday;
    }

    renderHabits() {
        const habitsList = document.getElementById('habitsList');
        const emptyState = document.getElementById('emptyState');
        const sortedHabits = this.getSortedHabits();

        if (sortedHabits.length === 0) {
            habitsList.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        habitsList.innerHTML = sortedHabits.map((habit) => this.createHabitCard(habit)).join('');
    }

    createHabitCard(habit) {
        const cardClasses = habit.completedToday
            ? 'habit-card completed border-emerald-500/40 bg-emerald-500/10'
            : 'habit-card border-slate-800 bg-slate-900/80 hover:border-slate-600';

        const doneButtonClasses = habit.completedToday
            ? 'btn-done bg-emerald-600 text-white opacity-60 cursor-not-allowed'
            : 'btn-done bg-sky-600 text-white hover:bg-sky-500';

        const streakLabel = habit.streak > 0
            ? `<span class="streak-badge inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1 text-sm font-semibold text-orange-300">🔥 ${habit.streak} day${habit.streak === 1 ? '' : 's'}</span>`
            : '<span class="muted-text text-sm text-slate-500">No streak yet</span>';

        const completionLabel = habit.completedToday
            ? '<span class="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Completed Today ✅</span>'
            : '';

        const doneButtonText = habit.completedToday ? 'Done Today' : 'Mark Done';

        return `
            <div class="${cardClasses} rounded-2xl border p-5 shadow-lg shadow-black/10 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20" data-habit-id="${habit.id}">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <h3 class="habit-title text-lg font-semibold text-white">${this.escapeHtml(habit.emoji)} ${this.escapeHtml(habit.name)}</h3>
                            ${completionLabel}
                        </div>
                        <div class="flex flex-wrap items-center gap-3">
                            ${streakLabel}
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 sm:ml-auto">
                        <button
                            class="${doneButtonClasses} rounded-xl px-4 py-2 font-semibold shadow-md shadow-black/10 transition-all duration-200 hover:shadow-lg"
                            data-action="done"
                            ${habit.completedToday ? 'disabled' : ''}
                            aria-label="Mark ${this.escapeHtml(habit.name)} as done"
                        >
                            ${doneButtonText}
                        </button>
                        <button
                            class="btn-delete rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white shadow-md shadow-black/10 hover:bg-rose-500 transition-all duration-200"
                            data-action="delete"
                            aria-label="Delete ${this.escapeHtml(habit.name)}"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getSortedHabits() {
        return [...this.habits].sort((left, right) => {
            if (left.completedToday !== right.completedToday) {
                return left.completedToday ? 1 : -1;
            }

            return left.name.localeCompare(right.name);
        });
    }

    normalizeHabitsForToday() {
        const today = this.getDateString(new Date());
        const yesterday = this.getDateString(this.getRelativeDate(-1));
        let changed = false;

        this.habits = this.habits.map((habit) => {
            const normalizedName = habit.normalizedName || this.normalizeHabitName(habit.name || '');
            const emoji = habit.emoji || this.getEmojiForHabit(habit.name || '');
            const lastCompletedDate = habit.lastCompletedDate || null;
            let streak = Number.isFinite(habit.streak) ? habit.streak : 0;
            let completedToday = lastCompletedDate === today;

            if (!completedToday && lastCompletedDate && lastCompletedDate !== yesterday) {
                if (streak !== 0) changed = true;
                streak = 0;
            }

            if (habit.completedToday !== completedToday) changed = true;

            return {
                ...habit,
                normalizedName,
                emoji,
                streak,
                completedToday,
                lastCompletedDate,
            };
        });

        if (changed) {
            this.saveHabits();
        }
    }

    flashCompletedHabit(id) {
        requestAnimationFrame(() => {
            const card = document.querySelector(`[data-habit-id="${id}"]`);

            if (!card) return;

            card.classList.add('done-pop');
            window.setTimeout(() => card.classList.remove('done-pop'), 260);
        });
    }

    getRelativeDate(offsetDays) {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return date;
    }

    getDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    normalizeHabitName(name) {
        return name.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    getEmojiForHabit(name) {
        const lowerName = name.toLowerCase();
        const emojiMap = [
            ['push', '💪'],
            ['gym', '💪'],
            ['workout', '💪'],
            ['exercise', '🏋️'],
            ['run', '🏃'],
            ['walk', '🚶'],
            ['study', '📚'],
            ['reading', '📖'],
            ['read', '📖'],
            ['focus', '🧠'],
            ['meditat', '🧘'],
            ['drink water', '💧'],
            ['water', '💧'],
            ['sleep', '🛏️'],
            ['coding', '💻'],
            ['code', '💻'],
            ['journal', '📝'],
            ['write', '✍️'],
            ['clean', '🧹'],
            ['tidy', '🧹'],
            ['music', '🎵'],
            ['piano', '🎹'],
            ['guitar', '🎸'],
            ['food', '🥗'],
            ['cook', '🍳'],
            ['protein', '🥚'],
            ['stretch', '🤸'],
        ];

        for (const [keyword, emoji] of emojiMap) {
            if (lowerName.includes(keyword)) {
                return emoji;
            }
        }

        return '✨';
    }

    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = String(value);
        return div.innerHTML;
    }

    saveHabits() {
        localStorage.setItem(this.storageKeys.habits, JSON.stringify(this.habits));
    }

    loadHabits() {
        const storedHabits = localStorage.getItem(this.storageKeys.habits);

        if (!storedHabits) return [];

        try {
            const parsedHabits = JSON.parse(storedHabits);
            return Array.isArray(parsedHabits) ? parsedHabits : [];
        } catch {
            return [];
        }
    }

    loadTheme() {
        const storedTheme = localStorage.getItem(this.storageKeys.theme);
        return storedTheme === 'light' ? 'light' : 'dark';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HabitTracker();
});
