/**
 * ChatRecall AI - Utility Functions & Domain Knowledge Engine
 * Handles keyword expansion, semantic taxonomy matching,
 * URL verification, deduplication, and extension storage.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChatRecallUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Domain knowledge taxonomy for subject expansion
  const DOMAIN_TAXONOMY = {
    // Networking
    'computer communication networks': [
      'TCP/IP', 'OSI model', 'routing protocols', 'congestion control',
      'subnetting', 'network protocols', 'BGP', 'OSPF', 'DNS', 'HTTP/HTTPS',
      'packet switching', 'sockets', 'UDP', 'VLAN', 'Wireshark', 'ARP',
      'firewall', 'latency', 'bandwidth', 'MAC address'
    ],
    'networking': [
      'TCP/IP', 'OSI model', 'routing', 'DNS', 'DHCP', 'subnetting',
      'switches', 'routers', 'firewall', 'VPN', 'LAN', 'WAN', 'NAT'
    ],
    'computer networks': [
      'TCP/IP', 'OSI model', 'routing protocols', 'congestion control',
      'subnetting', 'network protocols', 'packet switching', 'sockets', 'UDP', 'ARP'
    ],

    // Programming & Languages
    'java programming': [
      'JVM', 'JDK', 'JRE', 'multithreading', 'garbage collection',
      'collections framework', 'polymorphism', 'inheritance', 'interfaces',
      'spring boot', 'generics', 'streams api', 'hashmap', 'arraylist',
      'concurrency', 'exceptions', 'maven', 'hibernate'
    ],
    'java': [
      'JVM', 'multithreading', 'collections framework', 'polymorphism',
      'inheritance', 'spring boot', 'generics', 'streams api', 'hashmap', 'concurrency'
    ],
    'python programming': [
      'Django', 'Flask', 'Pandas', 'NumPy', 'asyncio', 'decorators',
      'generators', 'list comprehension', 'PyTorch', 'FastAPI', 'virtualenv',
      'multiprocessing', 'type hinting', 'pytest'
    ],
    'python': [
      'Django', 'Flask', 'Pandas', 'NumPy', 'asyncio', 'decorators',
      'generators', 'list comprehension', 'PyTorch', 'FastAPI'
    ],
    'c++ programming': [
      'pointers', 'memory management', 'smart pointers', 'STL', 'templates',
      'RAII', 'virtual functions', 'references', 'concurrency', 'vector', 'move semantics'
    ],
    'c++': [
      'pointers', 'smart pointers', 'STL', 'templates', 'RAII', 'virtual functions', 'memory leak'
    ],

    // Computer Science Core
    'data structures': [
      'binary search tree', 'AVL tree', 'graph traversal', 'BFS', 'DFS',
      'linked list', 'hash table', 'heap', 'priority queue', 'trie',
      'stack', 'queue', 'dynamic programming', 'time complexity', 'big O',
      'recursion', 'dijkstra', 'quicksort', 'mergesort'
    ],
    'algorithms': [
      'dynamic programming', 'greedy algorithm', 'divide and conquer',
      'quicksort', 'mergesort', 'binary search', 'asymptotic analysis',
      'shortest path', 'minimum spanning tree', 'knapsack problem', 'backtracking'
    ],
    'data structures and algorithms': [
      'binary search tree', 'graph', 'linked list', 'hash table', 'heap',
      'stack', 'queue', 'dynamic programming', 'time complexity', 'big O',
      'sorting algorithms', 'recursion', 'dijkstra'
    ],
    'operating systems': [
      'process scheduling', 'threads', 'deadlock', 'semaphores', 'mutex',
      'virtual memory', 'paging', 'segmentation', 'cache memory', 'system calls',
      'file systems', 'kernel', 'context switching', 'IPC', 'memory management'
    ],
    'database management': [
      'SQL', 'normalization', 'relational database', 'ACID properties',
      'indexing', 'B-tree', 'joins', 'transactions', 'NoSQL', 'MongoDB',
      'foreign key', 'stored procedures', 'sharding', 'replication'
    ],
    'dbms': [
      'SQL', 'normalization', 'ACID properties', 'indexing', 'B-tree',
      'joins', 'transactions', 'NoSQL', 'MongoDB', 'foreign key'
    ],
    'database systems': [
      'SQL', 'normalization', 'ACID', 'indexing', 'transactions', 'joins', 'NoSQL'
    ],

    // AI & Data Science
    'machine learning': [
      'neural networks', 'gradient descent', 'backpropagation', 'transformers',
      'attention mechanism', 'supervised learning', 'unsupervised learning',
      'overfitting', 'loss function', 'CNN', 'RNN', 'LLM', 'hyperparameters',
      'cross-validation', 'precision and recall', 'deep learning'
    ],
    'deep learning': [
      'neural networks', 'backpropagation', 'transformers', 'CNN', 'RNN',
      'LSTM', 'attention mechanism', 'PyTorch', 'TensorFlow', 'GPUs', 'embeddings'
    ],
    'artificial intelligence': [
      'heuristics', 'A* search', 'natural language processing', 'reinforcement learning',
      'knowledge graph', 'prompt engineering', 'agents', 'RAG', 'vector database'
    ],

    // Web & Cloud
    'web development': [
      'React', 'Vue', 'CSS flexbox', 'CSS grid', 'DOM', 'JavaScript',
      'REST API', 'GraphQL', 'WebSockets', 'state management', 'responsive design',
      'authentication', 'JWT', 'Next.js', 'Node.js'
    ],
    'cloud computing': [
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'microservices',
      'serverless', 'load balancer', 'S3', 'virtual machine', 'CI/CD', 'Terraform'
    ],
    'cybersecurity': [
      'encryption', 'cryptography', 'SQL injection', 'XSS', 'CSRF',
      'penetration testing', 'firewalls', 'zero trust', 'TLS', 'SSL', 'PKI', 'hashing'
    ],
    'software engineering': [
      'design patterns', 'clean code', 'microservices', 'unit testing',
      'agile', 'scrum', 'refactoring', 'version control', 'git', 'SOLID principles'
    ]
  };

  const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
    'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
    'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
    'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
    'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
    'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
    'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or',
    'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
    'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
    'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
    'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
    'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
    'explain', 'tutorial', 'guide', 'basics', 'concept', 'notes', 'code', 'help', 'example'
  ]);

  /**
   * Normalizes a text string for matching (lowercased, punctuation stripped, collapsed spaces).
   */
  function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generates intelligent search keywords for a given subject.
   * Leverages taxonomy dictionary + algorithmic linguistic extraction.
   * @param {string} subject
   * @returns {string[]} array of unique relevant keywords
   */
  function generateKeywords(subject) {
    if (!subject || typeof subject !== 'string') return [];
    const normalized = normalizeText(subject);
    if (!normalized) return [];

    const keywordsSet = new Set();

    // 1. Check direct taxonomy lookup
    if (DOMAIN_TAXONOMY[normalized]) {
      DOMAIN_TAXONOMY[normalized].forEach(kw => keywordsSet.add(kw));
    }

    // 2. Check partial taxonomy match (e.g. "advanced computer networks" contains "computer networks")
    for (const [key, terms] of Object.entries(DOMAIN_TAXONOMY)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        terms.slice(0, 10).forEach(kw => keywordsSet.add(kw));
      }
    }

    // 3. Algorithmic extraction from the subject itself
    const tokens = normalized.split(/\s+/).filter(token => token.length > 2 && !STOP_WORDS.has(token));

    // Add meaningful individual words from the subject
    tokens.forEach(token => {
      keywordsSet.add(token);
      // Morphological expansion: network -> networking, program -> programming
      if (token.endsWith('ing') && token.length > 5) {
        keywordsSet.add(token.slice(0, -3));
      } else if (!token.endsWith('s')) {
        keywordsSet.add(token + 's');
      }
    });

    // Add bigrams from the subject if multiple words
    if (tokens.length >= 2) {
      for (let i = 0; i < tokens.length - 1; i++) {
        keywordsSet.add(`${tokens[i]} ${tokens[i + 1]}`);
      }
    }

    // Convert Set to Array and limit to top 15 most relevant
    return Array.from(keywordsSet).slice(0, 15);
  }

  /**
   * Evaluates relevance score and matched keywords between a conversation title
   * and the user subject + generated keywords.
   *
   * @param {string} title - Conversation title
   * @param {string} subject - Raw user subject query
   * @param {string[]} keywords - Expanded keywords
   * @returns {{ isMatch: boolean, score: number, matchedKeywords: string[] }}
   */
  function matchConversation(title, subject, keywords = []) {
    if (!title || (!subject && (!keywords || keywords.length === 0))) {
      return { isMatch: false, score: 0, matchedKeywords: [] };
    }

    const normTitle = normalizeText(title);
    const normSubject = normalizeText(subject);
    const matched = new Set();
    let score = 0;

    // 1. Exact subject phrase match in title (Highest priority)
    if (normSubject && normTitle.includes(normSubject)) {
      score += 100;
      matched.add(subject.trim());
    }

    // 2. Individual non-stop words from subject
    const subjectWords = normSubject
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    let subjectWordsMatchedCount = 0;
    subjectWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(normTitle)) {
        score += 35;
        subjectWordsMatchedCount++;
        matched.add(word);
      }
    });

    // If multi-word subject and all words appeared in the title, boost score
    if (subjectWords.length > 1 && subjectWordsMatchedCount === subjectWords.length) {
      score += 40;
    }

    // 3. Match against expanded domain keywords
    keywords.forEach(kw => {
      const normKw = normalizeText(kw);
      if (!normKw || normKw.length < 3) return;

      // Use word boundary check if single word, or substring for multi-word
      let isHit = false;
      if (normKw.includes(' ')) {
        isHit = normTitle.includes(normKw);
      } else {
        const regex = new RegExp(`\\b${normKw}\\b`, 'i');
        isHit = regex.test(normTitle);
      }

      if (isHit) {
        score += 25;
        matched.add(kw);
      }
    });

    // Threshold check:
    // Requires either:
    // - High score (at least 50 points, meaning multiple keyword hits or exact subject)
    // - At least one significant subject word + one keyword hit
    // This prevents false positives like a single common word matching.
    const isMatch = score >= 50 || (subjectWordsMatchedCount >= 1 && score >= 40);

    return {
      isMatch,
      score,
      matchedKeywords: Array.from(matched)
    };
  }

  /**
   * Validates if a URL is a genuine, verified conversation/thread URL.
   * Rejects landing pages, account settings, auth, etc.
   *
   * @param {string} url
   * @param {string} platform - 'chatgpt' | 'claude' | 'perplexity'
   * @returns {boolean}
   */
  function isValidConversationUrl(url, platform) {
    if (!url || typeof url !== 'string') return false;

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname;

      if (platform === 'chatgpt') {
        const isDomain = host === 'chatgpt.com' || host === 'chat.openai.com';
        if (!isDomain) return false;
        // Valid conversation format: /c/<uuid> or /g/<id>/c/<uuid>
        const isChatPath = path.startsWith('/c/') || path.includes('/c/');
        const isForbidden = path.includes('/auth') || path.includes('/login') || path.includes('/settings');
        return isChatPath && !isForbidden;
      }

      if (platform === 'claude') {
        const isDomain = host === 'claude.ai' || host.endsWith('.claude.ai');
        if (!isDomain) return false;
        // Valid conversation format: /chat/<uuid> or /project/...
        const isChatPath = path.startsWith('/chat/') || path.includes('/chat/');
        const isForbidden = path.includes('/login') || path.includes('/settings') || path.includes('/billing');
        return isChatPath && !isForbidden;
      }

      if (platform === 'perplexity') {
        const isDomain = host === 'www.perplexity.ai' || host === 'perplexity.ai';
        if (!isDomain) return false;
        // Valid conversation format: /search/<id-or-slug> or /thread/<id-or-slug>
        const isSearchOrThread = path.startsWith('/search/') || path.startsWith('/thread/');
        const isForbidden = path.startsWith('/pro') || path.startsWith('/settings') || path.startsWith('/api');
        return isSearchOrThread && !isForbidden;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes and canonicalizes a conversation URL.
   * Strips tracking query parameters, ensures standard protocol.
   */
  function canonicalizeUrl(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      // Remove common tracking params
      ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'].forEach(p => {
        parsed.searchParams.delete(p);
      });
      return parsed.toString();
    } catch {
      return url.trim();
    }
  }

  /**
   * Deduplicates a list of conversation results by URL and normalized title.
   * @param {Array} conversations
   * @returns {Array}
   */
  function deduplicateConversations(conversations) {
    if (!Array.isArray(conversations)) return [];
    const seenUrls = new Set();
    const seenTitles = new Set();
    const unique = [];

    for (const conv of conversations) {
      if (!conv || !conv.url) continue;
      const cleanUrl = canonicalizeUrl(conv.url);
      const cleanTitle = normalizeText(conv.title);

      if (seenUrls.has(cleanUrl) || (cleanTitle && seenTitles.has(cleanTitle + '::' + conv.platform))) {
        continue;
      }

      seenUrls.add(cleanUrl);
      if (cleanTitle) {
        seenTitles.add(cleanTitle + '::' + conv.platform);
      }
      unique.push({
        ...conv,
        url: cleanUrl
      });
    }

    return unique;
  }

  /**
   * Provides realistic sample conversation data for Hackathon demonstrations
   * or when the user wants to test the extension offline without requiring
   * 3 active signed-in AI subscriptions simultaneously.
   */
  function getSampleConversations(subject) {
    const norm = normalizeText(subject || 'Computer Communication Networks');
    const isNetworking = norm.includes('network') || norm.includes('communication') || norm.includes('tcp') || norm.includes('osi');
    const isJava = norm.includes('java') || norm.includes('spring') || norm.includes('jvm');
    const isDataStruct = norm.includes('data') || norm.includes('struct') || norm.includes('algorithm') || norm.includes('tree');
    const isOS = norm.includes('operating') || norm.includes('os') || norm.includes('process') || norm.includes('memory');

    if (isNetworking) {
      return [
        {
          id: 'demo-cg-1',
          platform: 'chatgpt',
          title: 'TCP/IP vs OSI Model: Layer Architecture and Protocol Comparison',
          url: 'https://chatgpt.com/c/6710a30b-9c4c-8001-9876-123456789abc',
          matchedKeywords: ['TCP/IP', 'OSI model', 'network protocols'],
          score: 125,
          timestamp: Date.now() - 86400000 * 2,
          isDemo: true
        },
        {
          id: 'demo-cg-2',
          platform: 'chatgpt',
          title: 'Computer Communication Networks: Congestion Control Algorithms (TCP Tahoe vs Reno)',
          url: 'https://chatgpt.com/c/6710b80f-1122-8001-aa44-9876543210fe',
          matchedKeywords: ['Computer Communication Networks', 'congestion control', 'TCP/IP'],
          score: 140,
          timestamp: Date.now() - 86400000 * 5,
          isDemo: true
        },
        {
          id: 'demo-cl-1',
          platform: 'claude',
          title: 'Subnetting Cheat Sheet and CIDR Notation Calculations for Networks',
          url: 'https://claude.ai/chat/3b123456-789a-4bcd-ef01-23456789abcd',
          matchedKeywords: ['subnetting', 'network protocols'],
          score: 95,
          timestamp: Date.now() - 86400000 * 3,
          isDemo: true
        },
        {
          id: 'demo-cl-2',
          platform: 'claude',
          title: 'Routing Protocols Analysis: Distance Vector vs Link State (OSPF, BGP)',
          url: 'https://claude.ai/chat/8f987654-321a-4cde-bb22-3456789abcde',
          matchedKeywords: ['routing protocols', 'BGP', 'OSPF'],
          score: 110,
          timestamp: Date.now() - 86400000 * 7,
          isDemo: true
        },
        {
          id: 'demo-cl-3',
          platform: 'claude',
          title: 'Wireshark Packet Analysis Lab: TCP Handshake & Retransmission',
          url: 'https://claude.ai/chat/4c567890-abcd-1234-ef56-7890abcdef12',
          matchedKeywords: ['Wireshark', 'packet switching', 'TCP/IP'],
          score: 100,
          timestamp: Date.now() - 86400000 * 10,
          isDemo: true
        },
        {
          id: 'demo-pp-1',
          platform: 'perplexity',
          title: 'Difference between packet switching and circuit switching in modern networks',
          url: 'https://www.perplexity.ai/search/difference-between-packet-switch-O1kG9xYTTw6f9vA2',
          matchedKeywords: ['packet switching', 'network protocols'],
          score: 90,
          timestamp: Date.now() - 86400000 * 4,
          isDemo: true
        }
      ];
    } else if (isJava) {
      return [
        {
          id: 'demo-cg-j1',
          platform: 'chatgpt',
          title: 'Java Programming: Concurrency and Thread Safety in HashMap',
          url: 'https://chatgpt.com/c/6710a30b-9c4c-8001-java-0123456789ab',
          matchedKeywords: ['Java Programming', 'hashmap', 'concurrency', 'multithreading'],
          score: 145,
          timestamp: Date.now() - 86400000,
          isDemo: true
        },
        {
          id: 'demo-cg-j2',
          platform: 'chatgpt',
          title: 'JVM Memory Architecture: Heap vs Stack and Garbage Collection',
          url: 'https://chatgpt.com/c/6710b80f-1122-8001-java-1234567890cd',
          matchedKeywords: ['JVM', 'garbage collection'],
          score: 110,
          timestamp: Date.now() - 86400000 * 4,
          isDemo: true
        },
        {
          id: 'demo-cl-j1',
          platform: 'claude',
          title: 'Java Collections Framework Deep Dive: List vs Set vs Map Implementations',
          url: 'https://claude.ai/chat/3b123456-789a-4bcd-java-23456789abcd',
          matchedKeywords: ['collections framework', 'arraylist', 'hashmap'],
          score: 115,
          timestamp: Date.now() - 86400000 * 2,
          isDemo: true
        },
        {
          id: 'demo-cl-j2',
          platform: 'claude',
          title: 'Spring Boot REST API with Spring Data JPA and Hibernate',
          url: 'https://claude.ai/chat/8f987654-321a-4cde-java-3456789abcde',
          matchedKeywords: ['spring boot', 'hibernate'],
          score: 95,
          timestamp: Date.now() - 86400000 * 6,
          isDemo: true
        },
        {
          id: 'demo-pp-j1',
          platform: 'perplexity',
          title: 'Java Stream API: map vs flatMap explained with practical code',
          url: 'https://www.perplexity.ai/search/java-stream-api-map-vs-flatmap-X4kP2xYTTw6f9vB3',
          matchedKeywords: ['streams api', 'Java'],
          score: 105,
          timestamp: Date.now() - 86400000 * 3,
          isDemo: true
        }
      ];
    } else if (isDataStruct) {
      return [
        {
          id: 'demo-cg-ds1',
          platform: 'chatgpt',
          title: 'Data Structures: Binary Search Tree vs AVL Tree Balancing',
          url: 'https://chatgpt.com/c/6710a30b-9c4c-8001-dsal-0123456789ab',
          matchedKeywords: ['Data Structures', 'binary search tree', 'AVL tree'],
          score: 150,
          timestamp: Date.now() - 86400000,
          isDemo: true
        },
        {
          id: 'demo-cl-ds1',
          platform: 'claude',
          title: 'Graph Traversal Algorithms: BFS and DFS Implementation in Python',
          url: 'https://claude.ai/chat/3b123456-789a-4bcd-dsal-23456789abcd',
          matchedKeywords: ['graph traversal', 'BFS', 'DFS'],
          score: 120,
          timestamp: Date.now() - 86400000 * 2,
          isDemo: true
        },
        {
          id: 'demo-cl-ds2',
          platform: 'claude',
          title: 'Dynamic Programming Memoization vs Tabulation for 0/1 Knapsack',
          url: 'https://claude.ai/chat/8f987654-321a-4cde-dsal-3456789abcde',
          matchedKeywords: ['dynamic programming', 'recursion', 'time complexity'],
          score: 110,
          timestamp: Date.now() - 86400000 * 5,
          isDemo: true
        },
        {
          id: 'demo-pp-ds1',
          platform: 'perplexity',
          title: 'Dijkstra Shortest Path Algorithm time complexity with priority queue heap',
          url: 'https://www.perplexity.ai/search/dijkstra-shortest-path-heap-priority-K9kP2xYTTw6f9vC1',
          matchedKeywords: ['dijkstra', 'priority queue', 'heap', 'time complexity'],
          score: 125,
          timestamp: Date.now() - 86400000 * 3,
          isDemo: true
        }
      ];
    } else if (isOS) {
      return [
        {
          id: 'demo-cg-os1',
          platform: 'chatgpt',
          title: 'Operating Systems: Deadlock Prevention and Banker Algorithm',
          url: 'https://chatgpt.com/c/6710a30b-9c4c-8001-opsys-0123456789ab',
          matchedKeywords: ['Operating Systems', 'deadlock', 'process scheduling'],
          score: 145,
          timestamp: Date.now() - 86400000,
          isDemo: true
        },
        {
          id: 'demo-cg-os2',
          platform: 'chatgpt',
          title: 'Virtual Memory, Paging, and Page Faults Replacement (LRU vs FIFO)',
          url: 'https://chatgpt.com/c/6710b80f-1122-8001-opsys-1234567890cd',
          matchedKeywords: ['virtual memory', 'paging', 'memory management'],
          score: 130,
          timestamp: Date.now() - 86400000 * 4,
          isDemo: true
        },
        {
          id: 'demo-cl-os1',
          platform: 'claude',
          title: 'Process vs Thread: Context Switching Overhead and IPC Mechanisms',
          url: 'https://claude.ai/chat/3b123456-789a-4bcd-opsys-23456789abcd',
          matchedKeywords: ['threads', 'context switching', 'IPC'],
          score: 120,
          timestamp: Date.now() - 86400000 * 3,
          isDemo: true
        },
        {
          id: 'demo-pp-os1',
          platform: 'perplexity',
          title: 'Semaphores vs Mutex lock differences in Operating Systems synchronization',
          url: 'https://www.perplexity.ai/search/semaphores-vs-mutex-os-synchronization-L2kP2xYTTw6f9vD9',
          matchedKeywords: ['semaphores', 'mutex', 'Operating Systems'],
          score: 135,
          timestamp: Date.now() - 86400000 * 2,
          isDemo: true
        }
      ];
    } else {
      // General fallback based on the entered topic
      const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
      return [
        {
          id: 'demo-gen-1',
          platform: 'chatgpt',
          title: `${capSubject}: Comprehensive Overview and Architectural Guide`,
          url: 'https://chatgpt.com/c/6710a30b-9c4c-8001-demo-0123456789ab',
          matchedKeywords: [capSubject],
          score: 120,
          timestamp: Date.now() - 86400000 * 2,
          isDemo: true
        },
        {
          id: 'demo-gen-2',
          platform: 'chatgpt',
          title: `${capSubject} Best Practices, Implementation Notes & Questions`,
          url: 'https://chatgpt.com/c/6710b80f-1122-8001-demo-1234567890cd',
          matchedKeywords: [capSubject],
          score: 110,
          timestamp: Date.now() - 86400000 * 4,
          isDemo: true
        },
        {
          id: 'demo-gen-3',
          platform: 'claude',
          title: `${capSubject} Step-by-Step Deep Dive and Technical Breakdown`,
          url: 'https://claude.ai/chat/3b123456-789a-4bcd-demo-23456789abcd',
          matchedKeywords: [capSubject],
          score: 115,
          timestamp: Date.now() - 86400000 * 3,
          isDemo: true
        },
        {
          id: 'demo-gen-4',
          platform: 'claude',
          title: `Debugging Common Issues and Edge Cases in ${capSubject}`,
          url: 'https://claude.ai/chat/8f987654-321a-4cde-demo-3456789abcde',
          matchedKeywords: [capSubject],
          score: 105,
          timestamp: Date.now() - 86400000 * 6,
          isDemo: true
        },
        {
          id: 'demo-gen-5',
          platform: 'claude',
          title: `${capSubject} Real World Case Studies & Comparative Analysis`,
          url: 'https://claude.ai/chat/4c567890-abcd-1234-demo-7890abcdef12',
          matchedKeywords: [capSubject],
          score: 100,
          timestamp: Date.now() - 86400000 * 8,
          isDemo: true
        },
        {
          id: 'demo-gen-6',
          platform: 'perplexity',
          title: `Latest research, developments and comparative benchmarks for ${capSubject}`,
          url: 'https://www.perplexity.ai/search/latest-research-and-benchmarks-M8kP2xYTTw6f9vE5',
          matchedKeywords: [capSubject],
          score: 95,
          timestamp: Date.now() - 86400000 * 1,
          isDemo: true
        }
      ];
    }
  }

  // Storage helper functions using chrome.storage.local
  async function getStoredSettings() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        resolve({
          maxCounts: { chatgpt: 3, claude: 3, perplexity: 3 },
          platforms: { chatgpt: true, claude: true, perplexity: true },
          keywordExpansion: true,
          autoOpenTabs: false,
          demoMode: false
        });
        return;
      }
      chrome.storage.local.get([
        'maxCounts',
        'platforms',
        'keywordExpansion',
        'autoOpenTabs',
        'demoMode'
      ], (items) => {
        resolve({
          maxCounts: items.maxCounts || { chatgpt: 3, claude: 3, perplexity: 3 },
          platforms: items.platforms || { chatgpt: true, claude: true, perplexity: true },
          keywordExpansion: items.keywordExpansion !== false,
          autoOpenTabs: Boolean(items.autoOpenTabs),
          demoMode: items.demoMode !== undefined ? items.demoMode : false
        });
      });
    });
  }

  async function saveStoredSettings(settings) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        resolve(true);
        return;
      }
      chrome.storage.local.set(settings, () => {
        resolve(true);
      });
    });
  }

  return {
    DOMAIN_TAXONOMY,
    STOP_WORDS,
    normalizeText,
    generateKeywords,
    matchConversation,
    isValidConversationUrl,
    canonicalizeUrl,
    deduplicateConversations,
    getSampleConversations,
    getStoredSettings,
    saveStoredSettings
  };
});
