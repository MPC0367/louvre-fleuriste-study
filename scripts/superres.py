# AI super-resolution, run locally (OpenCV dnn_superres, EDSR x4; model in ~/.cache/o2-superres/).
# Nothing leaves this Mac. Usage: uv run --with opencv-contrib-python scripts/superres.py in.png out.png
import sys, os, cv2
src, dst = sys.argv[1], sys.argv[2]
sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(os.path.expanduser('~/.cache/o2-superres/EDSR_x4.pb'))
sr.setModel('edsr', 4)
img = cv2.imread(src)
# Light de-blocking first so the model doesn't sharpen JPEG artefacts.
img = cv2.fastNlMeansDenoisingColored(img, None, 1.5, 1.5, 5, 15) if "--light" in sys.argv else img
out = sr.upsample(img)
cv2.imwrite(dst, out)
print('superres', img.shape[1], 'x', img.shape[0], '->', out.shape[1], 'x', out.shape[0])
