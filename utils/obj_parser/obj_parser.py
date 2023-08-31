#!/usr/bin/env python
#coding: utf-8
import os
import json
from optparse import OptionParser

INPUT_REQ = """
Input filename. Requirements:
    1) Wavefront format (.obj)
    2) One object in one file
    3) Object must be triangulated
    4) All faces are required (vertex/texture/normal)
"""

parser = OptionParser()
parser.add_option("-i", "--input", dest="file_in", help=INPUT_REQ)
parser.add_option("-o", "--output", dest="file_out", help="Output filename (ex. model.json)")
(options, args) = parser.parse_args()
if not options.file_in:
    parser.print_help()
    exit(1)

if not os.path.exists(options.file_in):
    print("File {} is not exists".format(options.file_in))
    exit(1)

fname = options.file_in

vertices = []
textures = []
normals = []


obj = {
    'mVertexPoints': [],
    'mTextureCoords': [],
    'mVertexNormals': [],
}


with open(fname) as f:
    for line in f.readlines():
        line = line.strip()
        if not line or line[0] == '#':  # skip comments
            continue

        parts = line.split(' ')
        if parts[0] == 'v':
            vertices.append(parts[1:])
        elif parts[0] == 'vt':
            textures.append(parts[1:])
        elif parts[0] == 'vn':
            normals.append(parts[1:])
        elif parts[0] == 'f':
            faces = parts[1:]
            if len(faces) != 3:
                print("Invalid faces. I need a triangulated object")

            for part in faces:
                try:
                    vface, tface, nface = map(lambda a: int(a) - 1, part.split('/'))
                except:
                    print("Invalid faces, I need a format like 1/1/1 (Verticle/Texture/Normal)")
                    exit(1)

                for item in vertices[vface]:
                    obj['mVertexPoints'].append(float(item))

                for item in normals[nface]:
                    obj['mVertexNormals'].append(float(item))

                for item in textures[tface]:
                    obj['mTextureCoords'].append(float(item))

print("Vertices: ", len(vertices))
print("Textures: ", len(textures))
print("Normals: ", len(normals))

if options.file_out:
    with open(options.file_out, 'w') as f:
        f.write(json.dumps(obj, indent=4))
else:
    print("No output file specified")