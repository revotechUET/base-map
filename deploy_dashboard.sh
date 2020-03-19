#!/bin/bash
rsync --delete -azvv ./* -e ssh pvep_xen:/opt/i2g/dashboard
