import { useLanguage } from '../../context/LanguageContext';
import type { ResultStatus, GeneratedResult } from '../../types';

type FilterStep = '01' | '02' | '03' | 'all';

interface Props {
  results: GeneratedResult[];
  activeStep: FilterStep;
  onStepClick: (step: FilterStep) => void;
}

const STEP01_STATUSES: ResultStatus[] = ['DRAFT', 'READY', 'KW_DONE'];
const STEP02_STATUSES: ResultStatus[] = ['PERSONA_WIP', 'PERSONA_DONE'];
const STEP03_STATUSES: ResultStatus[] = ['STRUCT_WIP', 'STRUCT_DONE'];

function StepCard({
  stepLabel,
  stepTitle,
  count,
  okCount,
  color,
  active,
  onClick,
  pulse,
}: {
  stepLabel: string;
  stepTitle: string;
  count: number;
  okCount: number;
  color: string;
  active: boolean;
  onClick: () => void;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 min-w-0 rounded-lg border text-left px-4 py-3 transition-all ${
        active ? 'border-opacity-60 bg-bg2' : 'border-bd bg-bg1 hover:bg-bg2'
      }`}
      style={{ borderTopColor: color, borderTopWidth: 2, borderColor: active ? color : undefined }}
    >
      <div className="flex items-center gap-2 mb-1">
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
          </span>
        )}
        <span className="text-xs font-mono font-semibold" style={{ color }}>{stepLabel}</span>
      </div>
      <div className="text-xs text-t2 mb-2 truncate">{stepTitle}</div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold" style={{ color: okCount > 0 ? '#3fb950' : '#8b949e' }}>
          ✓{okCount}
        </span>
        <span className="text-xs text-tM">/ {count}</span>
      </div>
    </button>
  );
}

export default function FlowSteps({ results, activeStep, onStepClick }: Props) {
  const { t } = useLanguage();

  const nonSkipped = results.filter(r => r.status !== 'SKIPPED');

  const step01Count = nonSkipped.filter(r => STEP01_STATUSES.includes(r.status)).length;
  const step01Ok = nonSkipped.filter(r => r.status === 'KW_DONE' || STEP02_STATUSES.includes(r.status) || STEP03_STATUSES.includes(r.status) || r.status === 'PUBLISHED').length;

  const step02Count = nonSkipped.filter(r => STEP02_STATUSES.includes(r.status) || STEP03_STATUSES.includes(r.status) || r.status === 'PUBLISHED').length;
  const step02Ok = nonSkipped.filter(r => r.status === 'PERSONA_DONE' || STEP03_STATUSES.includes(r.status) || r.status === 'PUBLISHED').length;

  const step03Count = nonSkipped.filter(r => STEP03_STATUSES.includes(r.status) || r.status === 'PUBLISHED').length;
  const step03Ok = nonSkipped.filter(r => r.status === 'STRUCT_DONE' || r.status === 'PUBLISHED').length;

  const hasWip = nonSkipped.some(r => r.status === 'PERSONA_WIP' || r.status === 'STRUCT_WIP');

  return (
    <div className="flex items-stretch gap-2 mb-3">
      <StepCard
        stepLabel={t('flowStep01')}
        stepTitle={t('flowStep01Label')}
        count={step01Count + step02Count + step03Count}
        okCount={step01Ok}
        color="#58a6ff"
        active={activeStep === '01'}
        onClick={() => onStepClick(activeStep === '01' ? 'all' : '01')}
      />
      <StepCard
        stepLabel={t('flowStep02')}
        stepTitle={t('flowStep02Label')}
        count={step02Count}
        okCount={step02Ok}
        color="#bc8cff"
        active={activeStep === '02'}
        onClick={() => onStepClick(activeStep === '02' ? 'all' : '02')}
        pulse={hasWip}
      />
      <StepCard
        stepLabel={t('flowStep03')}
        stepTitle={t('flowStep03Label')}
        count={step03Count}
        okCount={step03Ok}
        color="#3fb950"
        active={activeStep === '03'}
        onClick={() => onStepClick(activeStep === '03' ? 'all' : '03')}
      />
      <button
        onClick={() => onStepClick('all')}
        className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all ${
          activeStep === 'all'
            ? 'border-aB bg-bg2 text-aB'
            : 'border-bd bg-bg1 text-t2 hover:text-t1 hover:bg-bg2'
        }`}
      >
        {t('flowAll')}
      </button>
    </div>
  );
}
