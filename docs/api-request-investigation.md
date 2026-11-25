# EmployeeHub API request investigation

## Measurements

A fresh Chrome tab opened Overview, then followed the navigation links to Departments, Employees, Leave requests, Projects, Salaries, Attendance, Departments and Overview. The sequence completed within the cache freshness window. Counts cover application API requests only.

| Mode | Chrome Network before | Chrome Network after | Spring controller entries before | Spring controller entries after |
| --- | ---: | ---: | ---: | ---: |
| Development | 22 | 6 | 20 | 6 |
| Production | 12 | 6 | 12 | 6 |

Chrome DevTools Protocol recorded the requests. To count controller executions, an isolated localhost instance ran the existing compiled Spring application and its logging aspects. A reverse proxy forwarded the Next.js rewrites. The controller metric counts incoming requests logged by ControllerLoggingAspect. It does not estimate SQL statements. Development baseline cancellation is timing-dependent. In a separate run against the already-running backend the proxy forwarded 17 requests. For the controller comparison, the development baseline used the same callers with their original direct fetch transport. Production used the before-change bundle.

On the first Overview visit, development Chrome issued two department searches before and one after. Production already issued one on that first visit. The production savings came from reusing results during subsequent navigation. After the change, each of departments, employees, leave requests, projects, salaries and attendance accounted for one request across the sequence.

## Findings by module

| Consumers | Trigger and observation |
| --- | --- |
| Overview and Departments | DepartmentSummary belongs to Overview. Its mount effect and the department directory both requested the same empty department search. Strict Mode replays the development mount, and route changes remount independent consumers in either build. |
| Employees and department transfer | The employee directory loads people and department choices. Team details depend on the department identifier. Transfer destination choices reuse the department directory. |
| Leave requests | Employee and department filter choices overlap other modules. Submitted search criteria control a separate results effect. |
| Attendance | Monthly records depend on the selected month and retry state. The create and bulk editors need the employee directory. Different months must remain independent. |
| Projects | Generic record search loads projects. The details overlay uses included assignments when available and fetches by project identifier otherwise. The employee-project search has its own endpoint and key. |
| Salaries and performance reviews | Both use the shared Records component. Initial mount and submitted searches fetch data. Filtering already-loaded results is local. |

The network traces and effect dependencies explain the duplication without a render loop or automatic retry. Aborting a component's fetch could suppress an obsolete UI update after Spring had already received the request. Data access lived in individual consumers and had no shared in-flight or fresh result across mounts.

## Implementation and files

- Added `src/data/apiRequest.ts`. It owns query identity, in-flight sharing, cache policy, cancellation, invalidation and pending-write locks.
- Added `@tanstack/query-core` to `package.json` and `package-lock.json`. QueryClient provides a tested query lifecycle while existing typed domain functions and forms retain their interfaces. The full React hook adapter was unnecessary for this transport migration.
- Routed reads and writes through that layer in `src/app/attendance/{page,AttendanceEditor}.tsx`, `src/app/departments/api.ts`, `src/app/departments/DepartmentTeam.tsx`, `src/app/employees/page.tsx`, `src/app/leave-requests/api.ts`, `src/app/leave-requests/page.tsx`, `src/app/projects/ProjectDetails.tsx` and `src/components/records/fetchRecords.ts`. Overview and the generic record pages inherit the change through their existing helpers.
- Added `tests/apiRequest.test.mjs` and this report. No files removed. The backend, React Strict Mode setting and page layouts required no changes.

GET and the current POST search endpoints share reads by resource, path, method, normalized URL parameters and JSON payload. Object property order is immaterial. Identifiers, filters, date ranges and supplied page parameters distinguish requests. Each consumer receives a separately readable response. Unmounted consumers discard their results. Shared reads can finish for another subscriber or the next mount. An invalidating mutation cancels older transport work before it can repopulate the cache.

Successful reads stay fresh for 30 seconds. Inactive query entries are collectible after two minutes. Reads refresh on subsequent demand. There is no polling, focus refetch, reconnect refetch or automatic retry. QueryClient tracks request state centrally. Existing components retain their visible loading indicators, domain-specific errors and retry controls. Errors are eligible for a new request immediately.

## Writes and consistency

| Successful operation | Query families marked stale |
| --- | --- |
| Department creation | Departments, including Overview's source |
| Department transfer | Departments, employees and leave requests |
| Leave status change | Leave requests and attendance |
| Project write | Projects and employees |
| Employee update or termination | Employees and cached records that can embed employee details across departments, projects, attendance, leave, salaries and reviews |
| Other writes | The written resource |

Forms initiate writes through user events. Identical pending writes share a submission lock and the second attempt is rejected locally. Failed writes preserve cached results and the backend error response. There are no automatic write retries. Locks operate within one browser tab. Cross-tab submissions and ambiguous network failures still require backend idempotency for an exactly-once guarantee.

Cache entries live in memory. The application currently has no authentication flow. A tested `clearApiCache()` boundary clears cached data and cancels pending reads for a future logout or account switch. External changes can remain visible as old data until another read after freshness expires. Existing open views use their current refresh flows.

## Validation

- Chrome development and production route traversal, revisits, Network capture and Spring AOP counts as above.
- Production Chrome against Spring verified distinct project searches, reuse of identical criteria, an empty result and loading Performance reviews.
- Production Chrome with a controlled pending response verified rapid navigation away from Projects and back produced one request.
- Production Chrome with an intercepted department API submitted the real form twice and observed one create and one post-success reload.
- Twelve Node regression tests cover concurrency, abort and replay, independent criteria and page keys, expiry, failed reads, backend conflict propagation, duplicate submissions, write invalidation including update, delete and bulk, old response races and session clearing. Run with `node --test tests/apiRequest.test.mjs` on Node 26.
- Lint, Prettier format check and the production build passed. The build includes TypeScript checking.

Writes were exercised with controlled responses to preserve existing HR records. No live database CRUD, login/logout or browser pagination claim is made. Current screens have no server-pagination controls. The project assignment invalidation rule was tested at the request layer for future project writes.
