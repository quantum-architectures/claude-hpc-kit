#!/bin/bash
# A PBS job template. Copy it to the site, then submit it from your project:
#   hpc push jobs/job.pbs.sh && hpc sbatch jobs/job.pbs.sh
# Replace every <...> value. Your site notes (~/.config/hpc/notes/<site>.md) list the right ones.
#PBS -N <short-job-name>
#PBS -A <project-or-allocation>
#PBS -q <queue>
#PBS -l select=1
#PBS -l walltime=02:00:00
# -k doe writes the logs where hpc log can read them while the job runs.
#PBS -k doe
#PBS -j oe

set -euo pipefail
cd "$PBS_O_WORKDIR"
echo "job $PBS_JOBID on $(hostname) at $(date)"

.venv/bin/python <your_script.py> --out "results/${PBS_JOBID%%.*}"

echo "done at $(date)"
