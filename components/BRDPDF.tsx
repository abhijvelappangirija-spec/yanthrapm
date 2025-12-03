'use client'

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import React from 'react'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  h1: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  h2: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 10,
  },
  h3: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 10,
    lineHeight: 1.6,
  },
  listItem: {
    marginBottom: 6,
    marginLeft: 20,
    lineHeight: 1.5,
  },
  listBullet: {
    marginRight: 8,
  },
})

interface BRDPDFProps {
  content: string
}

interface PDFElement {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'text'
  text: string
}

// Parse HTML and convert to structured PDF elements
function parseHTMLToPDFElements(html: string): PDFElement[] {
  const elements: PDFElement[] = []
  
  // Always use DOM parsing if available (client-side)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    
    function traverse(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        const tagName = element.tagName?.toLowerCase()
        
        if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
          const text = element.textContent?.trim()
          if (text) {
            elements.push({ type: tagName as 'h1' | 'h2' | 'h3', text })
          }
          return // Don't traverse children of headings
        } else if (tagName === 'p') {
          const text = element.textContent?.trim()
          if (text) {
            elements.push({ type: 'p', text })
          }
          return // Don't traverse children of paragraphs
        } else if (tagName === 'li') {
          const text = element.textContent?.trim()
          if (text) {
            elements.push({ type: 'li', text })
          }
          return // Don't traverse children of list items
        } else if (tagName === 'ul' || tagName === 'ol') {
          // Traverse list items
          Array.from(element.children).forEach(child => {
            if (child.tagName?.toLowerCase() === 'li') {
              const text = child.textContent?.trim()
              if (text) {
                elements.push({ type: 'li', text })
              }
            }
          })
          return
        }
      }
      
      // Traverse children for other elements
      Array.from(node.childNodes).forEach(traverse)
    }
    
    traverse(tmp)
  } else {
    // Server-side: use regex-based parsing (fallback)
    // Replace HTML entities first
    let text = html
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
    
    // Extract all block elements with their positions
    const regex = /<(h1|h2|h3|p|li)[^>]*>(.*?)<\/\1>/gis
    const matches: Array<{ type: 'h1' | 'h2' | 'h3' | 'p' | 'li', text: string, pos: number }> = []
    
    let match
    while ((match = regex.exec(text)) !== null) {
      const tagName = match[1].toLowerCase()
      const content = match[2]
        .replace(/<[^>]*>/g, '') // Remove nested tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()
      
      if (content) {
        matches.push({
          type: tagName as 'h1' | 'h2' | 'h3' | 'p' | 'li',
          text: content,
          pos: match.index || 0,
        })
      }
    }
    
    // Sort by position
    matches.sort((a, b) => a.pos - b.pos)
    elements.push(...matches.map(m => ({ type: m.type, text: m.text })))
    
    // If no structured elements found, extract all text
    if (elements.length === 0) {
      const plainText = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      if (plainText) {
        // Split into paragraphs by double spaces or newlines
        const paragraphs = plainText
          .split(/\n\n+|  +/)
          .map(p => p.trim())
          .filter(p => p.length > 0)
        
        paragraphs.forEach(p => {
          elements.push({ type: 'p', text: p })
        })
      }
    }
  }
  
  return elements
}

export function BRDPDFDocument({ content }: BRDPDFProps) {
  const elements = parseHTMLToPDFElements(content)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.title}>Business Requirements Document</Text>
          {elements.map((element, index) => {
            switch (element.type) {
              case 'h1':
                return (
                  <Text key={index} style={styles.h1}>
                    {element.text}
                  </Text>
                )
              case 'h2':
                return (
                  <Text key={index} style={styles.h2}>
                    {element.text}
                  </Text>
                )
              case 'h3':
                return (
                  <Text key={index} style={styles.h3}>
                    {element.text}
                  </Text>
                )
              case 'li':
                return (
                  <Text key={index} style={styles.listItem}>
                    • {element.text}
                  </Text>
                )
              case 'p':
              default:
                return (
                  <Text key={index} style={styles.paragraph}>
                    {element.text}
                  </Text>
                )
            }
          })}
        </View>
      </Page>
    </Document>
  )
}

export async function generateBRDPDF(content: string): Promise<Blob> {
  const blob = await pdf(<BRDPDFDocument content={content} />).toBlob()
  return blob
}

