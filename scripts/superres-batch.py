# Batch AI super-resolution, run locally (OpenCV dnn_superres, EDSR x4; model in ~/.cache/o2-superres/).
# Loads the model once. Usage:
#   uv run --with opencv-contrib-python scripts/superres-batch.py <in_dir> <out_dir> [--glob '*.jpg'] [--skip-existing]
# Writes <out_dir>/<name>.png at 4x. Nothing leaves this Mac.
import sys, os, glob, time, cv2
args = [a for a in sys.argv[1:] if not a.startswith('--')]
src_dir, out_dir = args[0], args[1]
pattern = '*.jpg'
if '--glob' in sys.argv:
    pattern = sys.argv[sys.argv.index('--glob') + 1]
skip = '--skip-existing' in sys.argv
os.makedirs(out_dir, exist_ok=True)
sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(os.path.expanduser('~/.cache/o2-superres/EDSR_x4.pb'))
sr.setModel('edsr', 4)
files = sorted(glob.glob(os.path.join(src_dir, pattern)))
t0 = time.time()
n = 0
for f in files:
    name = os.path.splitext(os.path.basename(f))[0]
    dst = os.path.join(out_dir, name + '.png')
    if skip and os.path.exists(dst):
        continue
    img = cv2.imread(f)
    if img is None:
        print('skip unreadable', f); continue
    cv2.imwrite(dst, sr.upsample(img))
    n += 1
print(f'superres: {n} images in {time.time() - t0:.0f}s -> {out_dir}')
