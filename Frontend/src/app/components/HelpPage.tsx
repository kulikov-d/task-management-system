import { useState } from "react";
import { Shield, UserCog, User as UserIcon, ChevronDown, Search, Monitor, MousePointerClick, ListChecks, ClipboardList, BarChart2, Users, Zap, Bell, FolderKanban, Timer, MessageSquare, Paperclip, Settings2, HelpCircle, Keyboard, Calendar as CalendarIcon, GanttChart, ScrollText, BookOpen } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useAppStore } from "../stores/appStore";
import { Card, CardContent } from "./ui/card";

interface GuideItem {
  title: string;
  steps: string[];
}

interface GuideSection {
  id: string;
  icon: any;
  title: string;
  description: string;
  roles: string[];
  items: GuideItem[];
}

const ROLE_LABELS: Record<string, { label: string; icon: any }> = {
  admin: { label: "Администратор", icon: Shield },
  lead: { label: "Тимлид", icon: UserCog },
  developer: { label: "Разработчик", icon: UserIcon },
};

const SECTIONS: GuideSection[] = [
  {
    id: "start",
    icon: Monitor,
    title: "Начало работы",
    description: "Что нужно знать в первую очередь",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Навигация по системе",
        steps: [
          "Слева находится боковое меню. Кликните по разделу, чтобы открыть его.",
          "Сверху — хлебные крошки: показывают, где вы находитесь.",
          "Правая кнопка «+ Задача» в шапке — самый быстрый способ создать задачу.",
          "Иконка луны/солнца в шапке переключает светлую/тёмную тему.",
        ],
      },
      {
        title: "Быстрый поиск (Ctrl+K)",
        steps: [
          "Нажмите Ctrl+K — откроется палитра команд.",
          "Начните печатать название задачи, проекта или имя человека.",
          "Выберите результат стрелками ↑↓ и нажмите Enter.",
          "Для задачи палитра откроет её прямо на Kanban-доске.",
        ],
      },
    ],
  },
  {
    id: "tasks",
    icon: ClipboardList,
    title: "Задачи (Kanban-доска)",
    description: "Работа с задачами: создание, статусы, перетаскивание",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Создать задачу",
        steps: [
          "Нажмите «+ Задача» в шапке.",
          "Введите название, выберите проект, приоритет и исполнителя.",
          "Можно указать дедлайн. Нажмите «Создать».",
        ],
      },
      {
        title: "Изменить статус перетаскиванием",
        steps: [
          "Нажмите и удерживайте карточку задачи левой кнопкой мыши.",
          "Перетащите её в нужную колонку: TODO → В работе → На ревью → Готово.",
          "Отпустите — статус сохранится автоматически.",
        ],
      },
      {
        title: "Контекстное меню (правая кнопка мыши)",
        steps: [
          "Кликните по карточке ПРАВОЙ кнопкой мыши.",
          "В меню: «Назначить себя», «В работу», «На ревью», «Готово», «Скопировать ID», «Удалить».",
          "Выберите действие — оно выполнится сразу.",
        ],
      },
      {
        title: "Открыть детали задачи",
        steps: [
          "Кликните по карточке ЛЕВОЙ кнопкой мыши.",
          "Справа откроется панель с деталями: таймер, комментарии, вложения.",
        ],
      },
      {
        title: "Фильтры над доской",
        steps: [
          "Панель фильтров: по исполнителю, приоритету и тегу.",
          "Выберите значение — задачи отфильтруются.",
          "Кнопка «Сбросить» очищает все фильтры.",
        ],
      },
    ],
  },
  {
    id: "task-detail",
    icon: MousePointerClick,
    title: "Панель деталей задачи",
    description: "Таймер, комментарии и вложения",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Таймер (учёт времени)",
        steps: [
          "Откройте детали задачи кликом по карточке.",
          "Доступен только исполнителю задачи.",
          "Нажмите «Запустить» — пойдёт отсчёт времени.",
          "Снова нажмите — таймер остановится. Время сохранится.",
          "На Kanban-доске у задачи с таймером появится пульсирующая зелёная точка.",
        ],
      },
      {
        title: "Оставить комментарий",
        steps: [
          "В разделе «Комментарии» введите текст.",
          "Нажмите «Отпр.» — комментарий появится в списке.",
          "Удалить можно только свой комментарий (иконка X).",
        ],
      },
      {
        title: "Прикрепить файл",
        steps: [
          "В разделе «Вложения» нажмите «+ Файл».",
          "Выберите файл в диалоге — он загрузится.",
          "Рядом с файлом: кнопка скачивания и кнопка удаления.",
        ],
      },
      {
        title: "Редактировать задачу",
        steps: [
          "Нажмите «Редактировать» в панели деталей.",
          "Измените название, описание, приоритет, исполнителя или дедлайн.",
          "Нажмите «Сохранить».",
        ],
      },
    ],
  },
  {
    id: "dashboard",
    icon: Monitor,
    title: "Дашборд",
    description: "Обзор проекта и быстрые действия",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Что на экране",
        steps: [
          "Карточки статистики: всего задач, в работе, на ревью, просрочено.",
          "Диаграмма распределения по статусам.",
          "Последние 5 созданных задач — клик открывает детали.",
          "Список проектов с прогрессом — клик открывает проект.",
        ],
      },
      {
        title: "Кнопки быстрого действия",
        steps: [
          "«+ Задачу» — открывает окно быстрого создания задачи.",
          "«Спринт» — переход к задачам.",
          "«+ Участника» — переход к разделу «Команда».",
        ],
      },
    ],
  },
  {
    id: "my-tasks",
    icon: ListChecks,
    title: "Мои задачи",
    description: "Личный список задач и статистика",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Как пользоваться",
        steps: [
          "Раздел показывают задачи, назначенные на вас.",
          "Сверху — карточки статистики: всего, к выполнению, в работе, на ревью, готово.",
          "Клик по карточке статистики фильтрует список.",
          "Кнопки-фильтры над таблицей также сортируют задачи по статусу.",
          "Клик по строке задачи открывает панель деталей.",
        ],
      },
    ],
  },
  {
    id: "analytics",
    icon: BarChart2,
    title: "Аналитика",
    description: "Статистика и графики по проекту",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Вкладка «Обзор»",
        steps: [
          "Метрики: завершено (%), скорость, средняя скорость, просрочено.",
          "Графики: распределение по статусам, загрузка по исполнителям.",
          "Справа можно выбрать спринт для детализации.",
        ],
      },
      {
        title: "Вкладка «Загруженность»",
        steps: [
          "Показывает, какой объём задач у каждого исполнителя.",
          "Цветные полосы — распределение по статусам.",
        ],
      },
      {
        title: "Вкладка «Трудозатраты»",
        steps: [
          "Общее время по проекту и среднее время на задачу.",
          "Распределение времени по исполнителям, задачам и по дням.",
        ],
      },
    ],
  },
  {
    id: "team",
    icon: Users,
    title: "Команда",
    description: "Управление командами и участниками",
    roles: ["admin", "lead"],
    items: [
      {
        title: "Создать команду",
        steps: [
          "Нажмите «+» возле заголовка «Команды».",
          "Введите название и описание.",
          "Нажмите «Создать».",
        ],
      },
      {
        title: "Добавить участника",
        steps: [
          "Выберите команду в левой панели.",
          "В секции «Участники» нажмите «Добавить».",
          "Выберите пользователя и роль, нажмите «Добавить».",
        ],
      },
      {
        title: "Назначить проект команде",
        steps: [
          "Выберите команду.",
          "В секции «Проекты» нажмите «Назначить».",
          "Выберите проект и подтвердите.",
        ],
      },
      {
        title: "Удалить участника или команду",
        steps: [
          "Участник: кнопка X рядом с его именем.",
          "Команда: иконка корзины в заголовке команды, подтвердите удаление.",
        ],
      },
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Уведомления",
    description: "События, требующие вашего внимания",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Колокольчик в шапке",
        steps: [
          "Красная точка — есть непрочитанные уведомления.",
          "Клик по колокольчику открывает список последних уведомлений.",
          "Клик по уведомлению — переход к задаче и пометка «прочитано».",
          "«Прочитать все» — отмечает всё сразу.",
        ],
      },
      {
        title: "Типы уведомлений",
        steps: [
          "Назначение — вас назначили исполнителем.",
          "Просрочка — у задачи истёк дедлайн.",
          "Комментарий — новый комментарий к задаче.",
          "Статус — изменён статус задачи.",
        ],
      },
    ],
  },
  {
    id: "calendar",
    icon: CalendarIcon,
    title: "Календарь",
    description: "Задачи по датам дедлайна",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Как пользоваться",
        steps: [
          "Стрелки влево/вправо — переключение месяцев.",
          "Клик по дате — внизу покажутся задачи на этот день.",
          "Клик по задаче — переход к ней на Kanban-доске.",
          "Цветная точка у задачи — её приоритет.",
        ],
      },
    ],
  },
  {
    id: "timeline",
    icon: GanttChart,
    title: "Таймлайн (Гант)",
    description: "Задачи на временной шкале",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Как пользоваться",
        steps: [
          "Слева — список задач, справа — временная шкала.",
          "Бары: 3 дня до дедлайна, цвет = статус задачи.",
          "Стрелки переключают период.",
          "Клик по бару или названию задачи — переход к задаче.",
        ],
      },
    ],
  },
  {
    id: "backlog",
    icon: ScrollText,
    title: "Бэклог",
    description: "Полный список задач без привязки к колонкам",
    roles: ["admin", "lead", "developer"],
    items: [
      {
        title: "Как пользоваться",
        steps: [
          "Все задачи проекта отсортированы по приоритету.",
          "Фильтры по статусу и приоритету над списком.",
          "Клик по задаче — открывает панель деталей.",
        ],
      },
    ],
  },
  {
    id: "audit",
    icon: Shield,
    title: "Аудит",
    description: "Журнал действий всех пользователей",
    roles: ["admin", "lead"],
    items: [
      {
        title: "Как читать журнал",
        steps: [
          "Каждая строка: действие, сущность, описание, пользователь, время.",
          "Здесь видно, кто и когда создал/изменил/удалил задачу, комментарий, файл.",
        ],
      },
    ],
  },
  {
    id: "projects",
    icon: Settings2,
    title: "Проекты и настройки",
    description: "Управление проектом",
    roles: ["admin", "lead"],
    items: [
      {
        title: "Настройки проекта",
        steps: [
          "Откройте проект, затем кнопку «Настройки».",
          "Измените название/описание, нажмите «Сохранить».",
          "Добавьте участника: поиск по имени/email → роль → «Добавить».",
          "Создайте теги: название + цвет → «Создать».",
        ],
      },
      {
        title: "Удалить участника",
        steps: [
          "В списке участников нажмите ссылку «Удалить».",
          "Нельзя удалить владельца проекта.",
        ],
      },
    ],
  },
  {
    id: "admin-only",
    icon: Shield,
    title: "Возможности администратора",
    description: "Только для роли Администратор",
    roles: ["admin"],
    items: [
      {
        title: "Удаление проекта",
        steps: [
          "Настройки проекта → секция «Опасная зона».",
          "«Удалить проект» → подтвердите. Отмена невозможна!",
        ],
      },
      {
        title: "Управление исключениями",
        steps: [
          "Настройки проекта → секция «Исключения».",
          "Добавьте пользователя, чтобы ограничить его доступ к проекту.",
        ],
      },
    ],
  },
];

function Section({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState<string | null>(section.items[0]?.title || null);
  const Icon = section.icon;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 flex items-center gap-2.5 border-b border-border">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-primary"
            style={{ background: "var(--accent)" }}>
            <Icon size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            <p className="text-[11px] text-muted-foreground">{section.description}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
            {section.items.length} тем
          </span>
        </div>
        <div className="p-2 space-y-1">
          {section.items.map((item) => {
            const isOpen = open === item.title;
            return (
              <div key={item.title} className="rounded-xl border border-border overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : item.title)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-accent/40 transition-colors">
                  <ChevronDown size={13}
                    className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  <span className="text-xs font-medium text-foreground flex-1">{item.title}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pt-1 bg-muted/20 space-y-1.5">
                    {item.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-px">{i + 1}</span>
                        <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function HelpPage() {
  const { user } = useAuthStore();
  const role = user?.role || "developer";
  const roleCfg = ROLE_LABELS[role] || ROLE_LABELS.developer;
  const RoleIcon = roleCfg.icon;
  const visible = SECTIONS.filter((s) => s.roles.includes(role));

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="px-6 pt-4 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}>
            <BookOpen size={15} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Помощь</h2>
            <p className="text-xs text-muted-foreground">Инструкция по использованию системы</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: "var(--accent)" }}>
          <RoleIcon size={13} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">Ваша роль: {roleCfg.label}</span>
        </div>
      </div>

      <div className="px-6 pt-3 pb-6 space-y-3 max-w-4xl">
        <div className="rounded-xl border border-primary/20 p-3.5 flex items-start gap-3"
          style={{ background: "linear-gradient(135deg, rgba(102,126,234,0.07) 0%, rgba(118,75,162,0.07) 100%)" }}>
          <HelpCircle size={16} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Здесь собраны инструкции, адаптированные под вашу роль <b className="text-foreground">{roleCfg.label.toLowerCase()}</b>.
              Разделы, недоступные вашей роли, скрыты автоматически. Нажмите на тему, чтобы раскрыть пошаговые инструкции.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((section) => (
            <Section key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}