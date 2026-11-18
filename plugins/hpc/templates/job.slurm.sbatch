#!/bin/bash
# A Slurm job template. Copy it to the site, then submit it from your project:
#   hpc push jobs/job.slurm.sbatch && hpc sbatch jobs/job.slurm.sbatch
# Replace every <...> value. Your site notes (~/.config/hpc/notes/<site>.md) list the right ones.
#SBATCH -J <short-job-name>
#SBATCH -p <partition>
#SBATCH -t 02:00:00                 # always set a time limit
#SBATCH -c 4
#SBATCH --mem=16G                   # measured peak memory + 15%
##SBATCH --gres=gpu:1               # uncomment for one GPU
#SBATCH -o logs/%x-%j.out           # logs/ exists: hpc sbatch creates it

set -euo pipefail
echo "job $SLURM_JOB_ID on $(hostname) at $(date)"

# Call the project's environment directly; `uv run` can re-resolve and stall on shared file systems.
.venv/bin/python <your_script.py> --out results/$SLURM_JOB_ID

echo "done at $(date)"
