/** One site of the hpc site registry that has a scheduler. */
export type Site = {
  /** The site name, as `SITE=<name> hpc ...` takes it. */
  key: string
  /** The ssh alias of the site. */
  host: string
  scheduler: 'slurm' | 'pbs'
  /** A local shell command that exits nonzero when the site is not connected. Empty when the registry gives none. */
  authCheck: string
  /** What the pane tells the person when the site is not connected. */
  hint: string
  /** A remote shell command. The pane shows the first line of its output in the site header. Empty for none. */
  budget: string
  /** The GPUs of one node, for PBS jobs that hold whole nodes. Zero when unknown. */
  gpusPerNode: number
}

/** The site registry as the pane read it last. */
export type Registry = {
  path: string
  /** False when the file could not be read. */
  isFound: boolean
  sites: Site[]
  /** Every HOST in the registry, schedulers or not. */
  hosts: string[]
}

/** One row of a site section: a job, or every task of one job array. */
export type Job = {
  id: string
  /** The array job id. Empty for a job outside an array. */
  array: string
  name: string
  /** The Slurm state, for example RUNNING, PENDING, FAILED. PBS states map to these names. */
  state: string
  /** The Slurm partition or the PBS queue. */
  queue: string
  nodes: number
  gpus: number
  /** The CPUs the row shows: the CPUs of the running tasks, or the request while no task runs. */
  cpus: number
  /** The CPUs that running tasks hold. Zero while nothing runs. */
  heldCpus: number
  running: number
  pending: number
  /** Seconds. */
  elapsed: number
  /** Seconds. */
  limit: number
  reason: string
  /** Epoch seconds. Zero while the job is live. */
  endedAt: number
  exitCode: string
  workDir: string
}

export type Cluster = {
  status: 'up' | 'down' | 'error'
  /** The first line of the site's BUDGET command. Empty when unknown. */
  budget: string
  jobs: Job[]
}

/** The job states one site showed at its last poll, and when. */
export type SeenSite = { at: number; states: Record<string, string> }

export type Seen = Record<string, SeenSite>

/** The end of the log of one job, as the log action read it. */
export type Tail = { key: string; path: string; lines: string[] }

declare module 'claude-code' {
  interface PluginState {
    'compute-pane': {
      registry: Registry | null
      clusters: Record<string, Cluster>
      seen: Seen | null
      /** Epoch ms of the last finished poll. Zero before the first. */
      polledAt: number
      /** Epoch ms, advanced every tick, so the age of the data redraws. */
      now: number
      isRefreshing: boolean
      /** The `site:id` key of the job row whose actions show. Empty when none. */
      expanded: string
      tail: Tail | null
      /** The ids of the jobs that this session's Bash calls submitted. */
      submitted: string[]
    }
  }
}
