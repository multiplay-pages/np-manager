# Walidacja – etap 2, cykl 1
Data: 2026-04-19 19:57:17

### Build shared (typy)
Komenda: `npm run build -w packages/shared`
Status: **SUCCESS** (1907ms)

```

> @np-manager/shared@1.0.0 build
> tsc


```

### Testy shared
Komenda: `npm run test -w packages/shared`
Status: **SUCCESS** (1003ms)

```

> @np-manager/shared@1.0.0 test
> vitest run --passWithNoTests


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90mC:/Users/cicha/OneDrive/Desktop/Projekt/np-manager/packages/shared[39m

No test files found, exiting with code 0


```

### Testy backend (smoke)
Komenda: `npm run test -w apps/backend`
Status: **SUCCESS** (7895ms)

```
... (pokazano ostatnie 4000 znaków)
zek","reqId":"da302313-c704-4990-a8f3-625b0112c140","req":{"method":"GET","url":"/health/ready","hostname":"localhost:80","remoteAddress":"127.0.0.1"},"msg":"incoming request"}
{"level":30,"time":1776628628729,"pid":11480,"hostname":"Trolopiszek","reqId":"a4d45881-14a6-4f60-944d-208fa7459575","req":{"method":"GET","url":"/health/ready","hostname":"localhost:80","remoteAddress":"127.0.0.1"},"msg":"incoming request"}
 [32m✓[39m prisma/__tests__/seed.communication-templates.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 26[2mms[22m[39m
 [32m✓[39m src/modules/porting-requests/__tests__/porting-request-communication.templates.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 5[2mms[22m[39m
 [32m✓[39m src/modules/porting-requests/__tests__/porting-notification-events.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 7[2mms[22m[39m
{"level":30,"time":1776628628762,"pid":11480,"hostname":"Trolopiszek","reqId":"f4cde81d-514c-4cd5-b6f5-7ad4dd96f402","req":{"method":"GET","url":"/health/ready","hostname":"localhost:80","remoteAddress":"127.0.0.1"},"msg":"incoming request"}
{"level":30,"time":1776628628656,"pid":11480,"hostname":"Trolopiszek","reqId":"c5125ffd-624b-4593-a878-7e45127c3fd8","res":{"statusCode":200},"responseTime":7.069099992513657,"msg":"request completed"}
{"level":30,"time":1776628628699,"pid":11480,"hostname":"Trolopiszek","reqId":"da302313-c704-4990-a8f3-625b0112c140","res":{"statusCode":200},"responseTime":1.4550000131130219,"msg":"request completed"}
{"level":30,"time":1776628628734,"pid":11480,"hostname":"Trolopiszek","reqId":"a4d45881-14a6-4f60-944d-208fa7459575","res":{"statusCode":503},"responseTime":3.9476999938488007,"msg":"request completed"}
{"level":30,"time":1776628628762,"pid":11480,"hostname":"Trolopiszek","reqId":"f4cde81d-514c-4cd5-b6f5-7ad4dd96f402","res":{"statusCode":503},"responseTime":0.5578999817371368,"msg":"request completed"}
 [32m✓[39m src/__tests__/app.health.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 202[2mms[22m[39m
 [32m✓[39m src/modules/admin-users/__tests__/admin-users.schema.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m prisma/__tests__/seed.qa-communication-fixtures.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 5[2mms[22m[39m
{"level":30,"time":1776628628914,"pid":24968,"hostname":"Trolopiszek","reqId":"4084f148-0906-48eb-8383-89e3d0975e82","req":{"method":"PATCH","url":"/api/auth/change-password","hostname":"localhost:80","remoteAddress":"127.0.0.1"},"msg":"incoming request"}
{"level":30,"time":1776628628956,"pid":24968,"hostname":"Trolopiszek","reqId":"92f0ef43-8936-47dc-8293-9aed1287032d","req":{"method":"PATCH","url":"/api/auth/change-password","hostname":"localhost:80","remoteAddress":"127.0.0.1"},"msg":"incoming request"}
{"level":30,"time":1776628628933,"pid":24968,"hostname":"Trolopiszek","reqId":"4084f148-0906-48eb-8383-89e3d0975e82","res":{"statusCode":401},"responseTime":11.952399998903275,"msg":"request completed"}
{"level":30,"time":1776628628962,"pid":24968,"hostname":"Trolopiszek","reqId":"92f0ef43-8936-47dc-8293-9aed1287032d","res":{"statusCode":200},"responseTime":5.233900010585785,"msg":"request completed"}
 [32m✓[39m src/__tests__/app.auth.routes.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 135[2mms[22m[39m
 [32m✓[39m src/shared/errors/__tests__/error-handler.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 9[2mms[22m[39m
 [32m✓[39m src/modules/porting-requests/__tests__/internal-notification-failures.router.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 4[2mms[22m[39m
 [32m✓[39m src/__tests__/app.runtime-routes.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 58[2mms[22m[39m

[2m Test Files [22m [1m[32m63 passed[39m[22m[90m (63)[39m
[2m      Tests [22m [1m[32m455 passed[39m[22m[90m (455)[39m
[2m   Start at [22m 21:57:02
[2m   Duration [22m 6.99s[2m (transform 10.39s, setup 0ms, collect 31.83s, tests 5.56s, environment 20ms, prepare 12.76s)[22m


```

### Testy frontend
Komenda: `npm run test -w apps/frontend`
Status: **SUCCESS** (7610ms)

```
... (pokazano ostatnie 4000 znaków)
tionPanel.test.tsx [2m([22m[2m10 tests[22m[2m)[22m[90m 118[2mms[22m[39m
 [32m✓[39m src/lib/notificationFailureQueueOperationalStatus.test.ts [2m([22m[2m11 tests[22m[2m)[22m[90m 8[2mms[22m[39m
 [32m✓[39m src/components/admin-settings/SystemModeSettingsPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[90m 22[2mms[22m[39m
 [32m✓[39m src/services/communicationTemplates.api.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 11[2mms[22m[39m
 [32m✓[39m src/components/admin-users/AdminUsersModule.test.tsx [2m([22m[2m10 tests[22m[2m)[22m[90m 115[2mms[22m[39m
 [32m✓[39m src/pages/Requests/RequestsPage.test.tsx [2m([22m[2m9 tests[22m[2m)[22m[90m 70[2mms[22m[39m
 [32m✓[39m src/components/admin-settings/PortingNotificationSettingsPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[90m 22[2mms[22m[39m
 [32m✓[39m src/services/adminSystemModeSettings.api.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 9[2mms[22m[39m
 [32m✓[39m src/components/CommunicationTemplatesAdmin/CommunicationTemplatesAdmin.test.tsx [2m([22m[2m5 tests[22m[2m)[22m[90m 187[2mms[22m[39m
 [32m✓[39m src/pages/Admin/SystemModeSettingsPage.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[90m 17[2mms[22m[39m
 [32m✓[39m src/services/adminUsers.api.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 11[2mms[22m[39m
 [32m✓[39m src/services/adminPortingNotificationSettings.api.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 8[2mms[22m[39m
 [32m✓[39m src/lib/portingOwnership.test.ts [2m([22m[2m3 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m src/services/adminNotificationFallbackSettings.api.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 9[2mms[22m[39m
 [32m✓[39m src/pages/Requests/requestDetailCapabilities.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m src/components/PortingInternalNotificationsPanel/PortingInternalNotificationsPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[90m 60[2mms[22m[39m
 [32m✓[39m src/components/layout/AppLayout.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[90m 137[2mms[22m[39m
 [32m✓[39m src/pages/Admin/PortingNotificationSettingsPage.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[90m 18[2mms[22m[39m
 [32m✓[39m src/lib/communicationTemplateAdmin.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m src/components/NotificationFailureHistoryPanel/NotificationFailureHistoryPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[90m 49[2mms[22m[39m
 [32m✓[39m src/services/auth.api.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 9[2mms[22m[39m
 [32m✓[39m src/lib/internalNotificationRetryMessages.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m src/stores/systemCapabilities.store.test.ts [2m([22m[2m1 test[22m[2m)[22m[90m 5[2mms[22m[39m
 [32m✓[39m src/pages/Auth/ForcePasswordChangePage.test.tsx [2m([22m[2m1 test[22m[2m)[22m[90m 11[2mms[22m[39m
 [32m✓[39m src/components/PortingCaseHistory/PortingCaseHistory.test.tsx [2m([22m[2m1 test[22m[2m)[22m[90m 12[2mms[22m[39m
 [32m✓[39m src/pages/Admin/AdminUsersPage.test.tsx [2m([22m[2m1 test[22m[2m)[22m[90m 10[2mms[22m[39m
 [32m✓[39m src/pages/Admin/CommunicationTemplatesAdminPage.test.tsx [2m([22m[2m1 test[22m[2m)[22m[90m 12[2mms[22m[39m
 [32m✓[39m src/components/InternalNotificationAttemptsPanel/InternalNotificationAttemptsPanel.test.tsx [2m([22m[2m5 tests[22m[2m)[22m[90m 265[2mms[22m[39m
 [32m✓[39m src/pages/Notifications/NotificationFailureQueuePage.test.tsx [2m([22m[2m10 tests[22m[2m)[22m[33m 525[2mms[22m[39m

[2m Test Files [22m [1m[32m36 passed[39m[22m[90m (36)[39m
[2m      Tests [22m [1m[32m193 passed[39m[22m[90m (193)[39m
[2m   Start at [22m 21:57:10
[2m   Duration [22m 6.60s[2m (transform 3.73s, setup 0ms, collect 12.81s, tests 1.95s, environment 3.55s, prepare 7.08s)[22m


```
