import { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  BarChart,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  CopyButton,
  DataTable,
  DescriptionList,
  Drawer,
  DropdownMenu,
  DynamicRowEditor,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  PasswordInput,
  ProgressBar,
  RadioGroup,
  SearchBar,
  Select,
  Skeleton,
  SkeletonText,
  Spinner,
  StatCard,
  StatusBadge,
  StatusBanner,
  Stepper,
  Switch,
  Tabs,
  Textarea,
  Timeline,
  Tooltip,
  toast,
} from '@/shared/components/ui';
import {
  Award,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Inbox,
  IndianRupee,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from '@/shared/icons';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { formatCompactMoney, formatMoney } from '@/shared/utils/helpers';

/**
 * Living catalogue of the shared UI kit (ticket SN2: "A demo page at /dev/ui lists every
 * component with its props"). Every example below uses the real components.
 */

const SECTIONS = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Form controls' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'display', label: 'Data display' },
  { id: 'table', label: 'Data table' },
  { id: 'charts', label: 'Charts' },
  { id: 'editors', label: 'Editors' },
];

const DEMO_ROWS = [
  { _id: '1', name: 'Aarav Sharma', email: 'student@demo.dev', status: 'IN_PROGRESS', amount: 1169910 },
  { _id: '2', name: 'Diya Patel', email: 'new.student@demo.dev', status: 'PENDING_PAYMENT', amount: 1299900 },
  { _id: '3', name: 'Meera Iyer', email: 'graduate@demo.dev', status: 'COMPLETED', amount: 1079920 },
  { _id: '4', name: 'Kabir Mehta', email: 'pending@demo.dev', status: 'PENDING_PAYMENT', amount: 949905 },
  { _id: '5', name: 'Rohan Gupta', email: 'leader@demo.dev', status: 'ACTIVE', amount: 1299900 },
  { _id: '6', name: 'Sneha Kapoor', email: 'sneha.kapoor@example.com', status: 'CANCELLED', amount: 1299900 },
];

const REVENUE = [
  { label: 'May', value: 4250000 },
  { label: 'Jun', value: 6120000 },
  { label: 'Jul', value: 5480000 },
  { label: 'Aug', value: 7930000 },
  { label: 'Sep', value: 8810000 },
  { label: 'Oct', value: 10240000 },
];

const BY_DESIGNATION = [
  { label: 'Java Developer', value: 42 },
  { label: 'Full Stack Developer', value: 37 },
  { label: 'DevOps Engineer', value: 21 },
  { label: '.NET Developer', value: 16 },
];

function PropsTable({ rows }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Prop</th>
            <th scope="col" className="px-3 py-2 font-semibold">Type / values</th>
            <th scope="col" className="px-3 py-2 font-semibold">Default</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(([prop, type, def]) => (
            <tr key={prop}>
              <td className="px-3 py-2 font-mono text-slate-900">{prop}</td>
              <td className="px-3 py-2 text-slate-600">{type}</td>
              <td className="px-3 py-2 font-mono text-slate-500">{def ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Demo({ title, description, props, children }) {
  return (
    <Card padding="none">
      <CardHeader title={title} description={description} titleAs="h3" />
      <CardBody>
        <div className="flex flex-wrap items-start gap-3">{children}</div>
        {props ? <PropsTable rows={props} /> : null}
      </CardBody>
    </Card>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-4">
      <h2 id={`${id}-title`} className="text-lg font-semibold text-slate-900">
        {title}
      </h2>
      <div className="grid gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}

export default function UiKitPage() {
  useDocumentTitle('UI kit');

  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('3');
  const [switchOn, setSwitchOn] = useState(true);
  const [tab, setTab] = useState('overview');
  const [page, setPage] = useState(2);
  const [rows, setRows] = useState([
    { key: 'a', text: 'What does HTTP status 409 mean?' },
    { key: 'b', text: 'Which hook memoises a callback?' },
  ]);

  return (
    <div className="container-page space-y-10 py-10">
      <PageHeader
        eyebrow="Developer"
        title="UI kit"
        description="Every shared component with its props and a live example. Import from '@/shared/components/ui'."
      />

      <nav aria-label="UI kit sections" className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 hover:border-brand-200 hover:text-brand-700"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <Section id="buttons" title="Buttons">
        <Demo
          title="Button"
          description="Primary actions use the brand colour; one primary button per area."
          props={[
            ['variant', 'primary | secondary | outline | ghost | danger | success | link', 'primary'],
            ['size', 'xs | sm | md | lg | icon', 'md'],
            ['loading', 'boolean (spinner, disabled, aria-busy)', 'false'],
            ['leftIcon / rightIcon', 'icon component, e.g. Plus', '—'],
            ['as', 'element type, e.g. Link', 'button'],
            ['fullWidth, disabled, type', 'boolean / boolean / string', "false / false / 'button'"],
          ]}
        >
          <Button leftIcon={Plus}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" leftIcon={Trash2}>
            Delete
          </Button>
          <Button variant="success" leftIcon={CheckCircle2}>
            Approve
          </Button>
          <Button variant="link">Link</Button>
          <Button loading>Saving</Button>
          <Button size="icon" variant="outline" aria-label="Edit">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Demo>
        <Demo
          title="CopyButton & Tooltip"
          description="Copy a value with feedback; tooltips show on hover and keyboard focus."
          props={[
            ['CopyButton.value', 'string', '—'],
            ['CopyButton.label / copiedLabel', 'string', "'Copy' / 'Copied'"],
            ['CopyButton.iconOnly', 'boolean', 'false'],
            ['Tooltip.content', 'node', '—'],
            ['Tooltip.side', 'top | bottom | left | right', 'top'],
          ]}
        >
          <CopyButton value="IP-2026-000123" label="Copy number" />
          <Tooltip content="Certificates are verified publicly by number">
            <Button variant="outline">Hover or focus me</Button>
          </Tooltip>
        </Demo>
      </Section>

      <Section id="forms" title="Form controls">
        <Demo
          title="Input, PasswordInput, Textarea"
          description="Labels, hints and errors are wired to the field for screen readers."
          props={[
            ['label, hint, error', 'string', '—'],
            ['required', 'boolean (adds * and aria-required)', 'false'],
            ['leftIcon / rightElement', 'component / node', '—'],
            ['Textarea.showCount, minLength, maxLength, count', 'boolean, number, number, number', '—'],
          ]}
        >
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" placeholder="you@example.com" hint="We never share it." />
            <Input label="Name" defaultValue="A" error="Name must be at least 2 characters." required />
            <PasswordInput label="Password" placeholder="At least 8 characters" />
            <Input label="Search" leftIcon={Search} placeholder="With an icon" />
            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                showCount
                minLength={50}
                maxLength={5000}
                placeholder="Describe what you built and how you tested it"
              />
            </div>
          </div>
        </Demo>
        <Demo
          title="Select, Checkbox, Switch, RadioGroup, SearchBar"
          props={[
            ['Select.options', '[{ value, label, disabled }]', '—'],
            ['Select.placeholder', 'string (disabled first option)', '—'],
            ['Checkbox.label / description', 'node / string', '—'],
            ['Switch.checked / onChange', 'boolean / (next) => void', '—'],
            ['RadioGroup.options / value / onChange / variant', "[{value,label,description}] / string / fn / 'default' | 'cards'", "variant 'default'"],
            ['SearchBar.value / onChange', 'string / (value) => void', '—'],
          ]}
        >
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <Select
              label="Duration"
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              options={[1, 2, 3, 4, 6].map((months) => ({
                value: String(months),
                label: `${months} ${months === 1 ? 'month' : 'months'}`,
              }))}
            />
            <SearchBar value={search} onChange={setSearch} placeholder="Search students" />
            <Checkbox
              label="I accept the Terms & Conditions"
              description="You can read them at any time on the Terms page."
            />
            <Switch
              checked={switchOn}
              onChange={setSwitchOn}
              label="Trainer review required"
              description="Tasks without review are approved by automated checks."
            />
            <div className="sm:col-span-2">
              <RadioGroup
                label="Decision"
                name="decision-demo"
                variant="cards"
                value="APPROVED"
                onChange={() => {}}
                options={[
                  { value: 'APPROVED', label: 'Approve', description: 'Unlocks dependent tasks.' },
                  { value: 'CHANGES_REQUESTED', label: 'Request changes', description: 'Student can resubmit.' },
                ]}
              />
            </div>
          </div>
        </Demo>
      </Section>

      <Section id="feedback" title="Feedback">
        <Demo
          title="StatusBanner (Alert)"
          description="Page-level notices and edge states (SN13)."
          props={[
            ['variant', 'info | success | warning | error', 'info'],
            ['title, children', 'string, node', '—'],
            ['action', 'node', '—'],
            ['onDismiss', '() => void', '—'],
          ]}
        >
          <div className="w-full space-y-3">
            <StatusBanner variant="info" title="Confirming your payment">
              A redirect is never proof of payment — we wait for the bank.
            </StatusBanner>
            <StatusBanner
              variant="error"
              title="Your last payment didn't go through"
              action={<Button size="sm">Retry payment</Button>}
            >
              No money was taken. You can try again now.
            </StatusBanner>
            <Alert variant="success" title="Submitted for review" />
          </div>
        </Demo>
        <Demo
          title="Toasts, Spinner, Skeleton"
          props={[
            ['toast.success / error / info / warning', "(title, { description, duration })", '—'],
            ['Spinner.size', 'xs | sm | md | lg', 'md'],
            ['SkeletonText.lines', 'number', '3'],
          ]}
        >
          <Button variant="outline" onClick={() => toast.success('Saved', { description: 'Your changes are live.' })}>
            Success toast
          </Button>
          <Button variant="outline" onClick={() => toast.error('Could not save', { description: 'Please try again.' })}>
            Error toast
          </Button>
          <Spinner size="sm" />
          <Spinner />
          <div className="w-full space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <SkeletonText lines={3} />
          </div>
        </Demo>
        <Demo
          title="EmptyState & ErrorState"
          props={[
            ['EmptyState.icon, title, description, action', 'component, string, string, node', '—'],
            ['EmptyState.variant', 'default | muted | locked', 'default'],
            ['ErrorState.error, onRetry', 'ApiError | Error | string, () => void', '—'],
          ]}
        >
          <div className="grid w-full gap-4 md:grid-cols-2">
            <EmptyState
              compact
              icon={Inbox}
              title="You're all caught up"
              description="New submissions will appear here."
            />
            <ErrorState
              compact
              error={{ message: "Can't reach the server.", isNetworkError: true }}
              onRetry={() => toast.info('Retrying…')}
            />
          </div>
        </Demo>
      </Section>

      <Section id="overlays" title="Overlays">
        <Demo
          title="Modal, Drawer, ConfirmDialog, DropdownMenu"
          description="Focus is trapped inside, Esc closes and focus returns to the opener."
          props={[
            ['open / onClose', 'boolean / () => void', '—'],
            ['title, description, footer', 'string, string, node', '—'],
            ['Modal.size', 'sm | md | lg | xl | 2xl | full', 'md'],
            ['Drawer.side / size', 'right | left / sm | md | lg | xl', 'right / md'],
            ['ConfirmDialog.onConfirm / variant / loading', 'fn / primary | danger / boolean', '— / primary / false'],
            ['DropdownMenu.trigger / items / align', 'element / [{ label, icon, onClick, to, danger, divider }] / start | end', '— / — / end'],
          ]}
        >
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            Open drawer
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Confirm dialog
          </Button>
          <DropdownMenu
            trigger={
              <Button variant="outline" size="icon" aria-label="Row actions">
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            }
            items={[
              { label: 'Edit', icon: Pencil, onClick: () => toast.info('Edit') },
              { label: 'Assign trainer', icon: Users, onClick: () => toast.info('Assign') },
              { divider: true },
              { label: 'Suspend', icon: Trash2, danger: true, onClick: () => toast.warning('Suspend') },
            ]}
          />

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Preview schedule"
            description="Day titles only — full content unlocks after payment."
            footer={<Button onClick={() => setModalOpen(false)}>Got it</Button>}
          >
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Repository structure, branches and project conventions</li>
              <li>Reproduce and debug an existing defect</li>
              <li>Resolve merge conflicts</li>
            </ol>
          </Modal>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Enrollment details"
            description="Price snapshot and payment events"
          >
            <DescriptionList
              items={[
                { label: 'Base price', value: formatMoney(1299900) },
                { label: 'Discount', value: '10%' },
                { label: 'Payable', value: formatMoney(1169910) },
                { label: 'Status', value: <StatusBadge status="IN_PROGRESS" /> },
              ]}
            />
          </Drawer>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              toast.success('User suspended');
            }}
            variant="danger"
            title="Suspend this user?"
            message="They will be signed out and cannot log in until reactivated."
            confirmLabel="Suspend"
          />
        </Demo>
      </Section>

      <Section id="display" title="Data display">
        <Demo
          title="Badge, StatusBadge, Avatar"
          description="Status always pairs colour with a text label."
          props={[
            ['Badge.variant', 'neutral | brand | success | warning | danger | info | purple | orange', 'neutral'],
            ['StatusBadge.status', 'any API status, e.g. CHANGES_REQUESTED', '—'],
            ['Avatar.name / src / size', 'string / url / xs | sm | md | lg | xl', '— / — / md'],
          ]}
        >
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success" dot>
            Success
          </Badge>
          <Badge variant="warning">Warning</Badge>
          <StatusBadge status="LOCKED" />
          <StatusBadge status="AVAILABLE" />
          <StatusBadge status="SUBMITTED" />
          <StatusBadge status="CHANGES_REQUESTED" />
          <StatusBadge status="APPROVED" />
          <StatusBadge status="PENDING_PAYMENT" />
          <Avatar name="Aarav Sharma" size="sm" />
          <Avatar name="Priya Nair" />
          <Avatar name="Vikram Singh" size="lg" />
        </Demo>
        <Demo
          title="StatCard & ProgressBar"
          props={[
            ['StatCard.label, value, icon, hint', 'string, node, component, node', '—'],
            ['StatCard.delta', "{ value, direction: 'up' | 'down' | 'flat', positiveIsGood, label }", '—'],
            ['ProgressBar.value / max / label / showValue / variant', 'number / number / string / boolean / brand | success | warning | danger', '— / 100 / — / false / brand'],
          ]}
        >
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <StatCard
              label="Total revenue"
              value={formatCompactMoney(42830000)}
              icon={IndianRupee}
              tone="brand"
              delta={{ value: '+12%', direction: 'up', label: 'vs last month' }}
            />
            <StatCard label="Pending reviews" value="5" icon={ClipboardList} hint="Oldest is 3 days old" />
            <div className="sm:col-span-2 space-y-3">
              <ProgressBar value={42} label="Tasks approved" showValue />
              <ProgressBar value={100} variant="success" label="Payment" showValue size="sm" />
            </div>
          </div>
        </Demo>
        <Demo
          title="Tabs, Stepper, Timeline"
          props={[
            ['Tabs.items', '[{ value, label, count, content }]', '—'],
            ['Tabs.value / onChange / variant', "string / fn / 'underline' | 'pills'", "— / — / 'underline'"],
            ['Stepper.steps / current', '[{ label }] / number', '—'],
            ['Timeline.items', '[{ id, title, description, time, icon, variant }]', '—'],
          ]}
        >
          <div className="w-full space-y-6">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'overview', label: 'Instructions', content: <p className="text-sm text-slate-600">Problem statement and acceptance criteria.</p> },
                { value: 'submit', label: 'Submit work', content: <p className="text-sm text-slate-600">Screenshots, description and GitHub link.</p> },
                { value: 'history', label: 'History', count: 2, content: <p className="text-sm text-slate-600">Earlier attempts and feedback.</p> },
              ]}
            />
            <Stepper
              current={2}
              steps={[{ label: 'Assessment' }, { label: 'Plan & terms' }, { label: 'Payment' }, { label: 'Start learning' }]}
            />
            <Timeline
              items={[
                { id: 'e1', title: 'Order created', time: new Date(Date.now() - 3600000).toISOString(), icon: CreditCard },
                { id: 'e2', title: 'Payment captured', variant: 'success', time: new Date().toISOString(), icon: CheckCircle2 },
                { id: 'e3', title: 'Certificate issued', variant: 'brand', description: 'IP-2026-000123', icon: Award },
              ]}
            />
          </div>
        </Demo>
      </Section>

      <Section id="table" title="Data table">
        <div className="xl:col-span-2 space-y-4">
          <DataTable
            caption="Demo enrollments"
            data={DEMO_ROWS}
            searchKeys={['name', 'email']}
            searchPlaceholder="Search students"
            pageSize={4}
            columns={[
              {
                key: 'name',
                header: 'Student',
                sortable: true,
                cell: (row) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name} size="sm" />
                    <div>
                      <p className="font-medium text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'status', header: 'Enrollment', cell: (row) => <StatusBadge status={row.status} /> },
              {
                key: 'amount',
                header: 'Payable',
                align: 'right',
                sortable: true,
                cell: (row) => <span className="tabular">{formatMoney(row.amount)}</span>,
              },
            ]}
            onRowClick={(row) => toast.info(row.name)}
          />
          <PropsTable
            rows={[
              ['columns', '[{ key, header, cell(row), align, sortable, className }]', '—'],
              ['fetcher + queryKey', '(params) => Promise<{ items, page, limit, total }> + array prefix', 'server mode'],
              ['data + searchKeys', 'array + string[]', 'client mode'],
              ['filters, toolbar, onRowClick, emptyState', 'object, node, fn, { icon, title, description, action }', '—'],
              ['pageSize, initialSort, rowKey, caption', "number, { key, direction }, string | fn, string", "10, —, '_id', —"],
            ]}
          />
          <Card>
            <Pagination page={page} limit={10} total={57} onPageChange={setPage} />
          </Card>
        </div>
      </Section>

      <Section id="charts" title="Charts">
        <Card padding="none">
          <CardHeader title="Revenue by month" description="Single series — one colour, no legend box." titleAs="h3" />
          <CardBody>
            <BarChart data={REVENUE} valueFormatter={formatCompactMoney} title="Revenue by month" />
          </CardBody>
        </Card>
        <Card padding="none">
          <CardHeader title="Enrollments by designation" titleAs="h3" />
          <CardBody>
            <BarChart data={BY_DESIGNATION} orientation="horizontal" title="Enrollments by designation" />
          </CardBody>
          <CardFooter>
            <span className="text-xs text-slate-500">Bars are focusable; values also available as a table.</span>
          </CardFooter>
        </Card>
      </Section>

      <Section id="editors" title="Editors">
        <Demo
          title="DynamicRowEditor (KD2)"
          description="Add, remove and reorder rows — used by the question, slab and schedule-day editors."
          props={[
            ['rows / onChange', 'array / (nextRows) => void', '—'],
            ['renderRow', '(row, index, { update, remove, moveUp, moveDown }) => node', '—'],
            ['createRow / addLabel / itemLabel', "() => row / string / string", "— / 'Add row' / 'Row'"],
            ['minRows / maxRows / reorderable / disabled', 'number / number / boolean / boolean', '0 / — / true / false'],
          ]}
        >
          <div className="w-full">
            <DynamicRowEditor
              rows={rows}
              onChange={setRows}
              itemLabel="Question"
              addLabel="Add question"
              maxRows={5}
              createRow={() => ({ key: `q-${Date.now()}`, text: '' })}
              getRowKey={(row) => row.key}
              renderRow={(row, index, { update }) => (
                <Input
                  label={`Question ${index + 1}`}
                  value={row.text}
                  onChange={(event) => update({ text: event.target.value })}
                />
              )}
            />
          </div>
        </Demo>
      </Section>
    </div>
  );
}
