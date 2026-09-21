#!/usr/bin/env python3
"""Sync humanized text into generate-diploma.js (which uses \\uXXXX escapes)."""
import json, re

JS_PATH = 'D:\\Share\\diplom\\v1\\ВКР\\generate-diploma.js'
DATA_PATH = 'D:\\Share\\diplom\\v1\\ВКР\\replacements.json'

def to_unicode_escapes(text):
    """Convert text to \\uXXXX escape sequences (UPPERCASE hex to match JS file)."""
    result = []
    for ch in text:
        cp = ord(ch)
        if cp > 127 or ch in ('\u2013', '\u2014', '\u00ab', '\u00bb'):
            result.append(f'\\u{cp:04X}')
        else:
            result.append(ch)
    return ''.join(result)

def main():
    with open(JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        replacements = json.load(f)
    
    replaced = 0
    not_found = 0
    for r in replacements:
        old_text = r['old']
        new_text = r['new']
        
        old_escaped = to_unicode_escapes(old_text)
        new_escaped = to_unicode_escapes(new_text)
        
        if old_escaped in content:
            content = content.replace(old_escaped, new_escaped, 1)
            replaced += 1
            print(f"  OK [{replaced}]: {old_text[:50]}...")
        else:
            not_found += 1
            print(f"  MISS: {old_text[:50]}...")
    
    with open(JS_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\nReplaced: {replaced}, Not found: {not_found}")

if __name__ == '__main__':
    main()
