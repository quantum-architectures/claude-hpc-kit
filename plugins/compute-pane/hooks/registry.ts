import type { Site } from '../types'

// The hpc site registry is a bash file of plain assignments. The pane reads the assignments and never runs the file.
// The site name may hold underscores, so the field names are listed: the name is what comes before a known field.
const ASSIGNMENT =
  /^\s*(?:export\s+)?site_(\w+?)_(HOST|SCHEDULER|AUTH_CHECK|AUTH_HINT|BUDGET|GPUS_PER_NODE|CONNECT)=(.*)$/

// Reads one shell word: unquoted, 'single-quoted' and "double-quoted" parts, joined. Stops at unquoted whitespace,
// so a trailing comment drops. Leaves $VAR as text.
export const shellWord = (raw: string) => {
  let out = ''
  let i = 0

  while (i < raw.length) {
    const c = raw.charAt(i)

    if (c === "'") {
      const end = raw.indexOf("'", i + 1)
      out += raw.slice(i + 1, end === -1 ? raw.length : end)
      i = end === -1 ? raw.length : end + 1
    } else if (c === '"') {
      i += 1

      while (i < raw.length && raw.charAt(i) !== '"') {
        if (raw.charAt(i) === '\\' && '"\\$`'.includes(raw.charAt(i + 1))) {
          i += 1
        }

        out += raw.charAt(i)
        i += 1
      }

      i += 1
    } else if (/\s/.test(c)) {
      break
    } else if (c === '\\') {
      out += raw.charAt(i + 1)
      i += 2
    } else {
      out += c
      i += 1
    }
  }

  return out
}

/** Reads the registry text. Returns every host, and the Slurm and PBS sites in the order of their HOST lines. */
export const parseRegistry = (text: string): { sites: Site[]; hosts: string[] } => {
  const fields = new Map<string, Record<string, string>>()
  const order: string[] = []

  for (const line of text.split('\n')) {
    const match = ASSIGNMENT.exec(line)

    if (match === null) {
      continue
    }

    const [, name = '', field = '', raw = ''] = match
    const site = fields.get(name) ?? {}
    // A later assignment wins, as in bash.
    site[field] = shellWord(raw)
    fields.set(name, site)

    if (field === 'HOST' && !order.includes(name)) {
      order.push(name)
    }
  }

  const hosts: string[] = []
  const sites: Site[] = []

  for (const key of order) {
    const site = fields.get(key) ?? {}
    const host = site.HOST ?? ''
    const scheduler = (site.SCHEDULER ?? '').toLowerCase()

    // A host that starts with "-" would read as an ssh option.
    if (host === '' || host.startsWith('-')) {
      continue
    }

    hosts.push(host)

    if (scheduler !== 'slurm' && scheduler !== 'pbs') {
      continue
    }

    const gpus = Number(site.GPUS_PER_NODE ?? 0)
    sites.push({
      key,
      host,
      scheduler,
      authCheck: site.AUTH_CHECK ?? '',
      hint: site.CONNECT ? `run ${site.CONNECT}` : site.AUTH_HINT || `connect to ${host}`,
      budget: site.BUDGET ?? '',
      gpusPerNode: Number.isFinite(gpus) && gpus > 0 ? Math.floor(gpus) : 0,
    })
  }

  return { sites, hosts }
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The hpc tool, the Slurm and PBS commands.
const TOOLS = String.raw`(^|[\s;&|(])(hpc\s+\w|(sbatch|salloc|srun)\s|(qsub|qstat)\b)`

/** Matches a Bash command that reaches a compute site: hpc, Slurm and PBS commands, ssh to a registry host. */
export const usesCompute = (hosts: readonly string[]) =>
  hosts.length === 0
    ? new RegExp(TOOLS)
    : new RegExp(
        String.raw`${TOOLS}|\bssh\s+(-\S+\s+)*([\w.-]+@)?(${hosts.map(escape).join('|')})(?=$|[\s;&|)'"])`,
      )

// The job id that sbatch prints, and the bare id that `sbatch --parsable` prints.
const SUBMITTED = /Submitted batch job (\d+)/g
const PARSABLE = /^(\d+)(;\S+)?$/gm
// The job id that qsub prints: the number, then a dot and the PBS server name, such as 1234.pbs-server.
const QUEUED = /^(\d+(?:\[\])?)\.[A-Za-z][\w.-]*$/gm

/** The ids of the jobs that one Bash call submitted, read from what it printed. */
export const submittedIds = (command: string, out: string) => {
  if (!/\b(sbatch|qsub)\b/.test(command)) {
    return []
  }

  const ids = [...out.matchAll(SUBMITTED), ...out.matchAll(QUEUED)].flatMap(match => match[1] ?? [])

  if (/--parsable\b/.test(command)) {
    ids.push(...[...out.matchAll(PARSABLE)].flatMap(match => match[1] ?? []))
  }

  return ids
}
