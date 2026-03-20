#!/bin/bash

OUTPUT_FILE="project_code.txt"

# Clear the output file if it already exists
> "$OUTPUT_FILE"

echo "Extracting code to $OUTPUT_FILE..."

# Find all files, pruning out node_modules, lockfiles, and image assets
find . -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -name "package-lock.json" \
  -not -name "*.png" \
  -not -name "*.svg" \
  -not -name "extract_code.sh" \
  -not -name "$OUTPUT_FILE" | sort | while read -r file; do
    
    echo "================================================================" >> "$OUTPUT_FILE"
    echo "File: $file" >> "$OUTPUT_FILE"
    echo "================================================================" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo -e "\n\n" >> "$OUTPUT_FILE"
    
done

echo "Done! You can now view your code using 'cat $OUTPUT_FILE' or open it in your editor."
