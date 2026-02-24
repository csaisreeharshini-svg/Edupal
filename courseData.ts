export interface Playlist {
  id: string;
  title: string;
  description: string;
  classRange: string;
  url: string;
  thumbnail: string;
  videoCount: number;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  playlists: Playlist[];
}

const mathIcon = 'M4 4h5l2.5 2.5L9.5 9 12 11.5l2.5-2.5L17 7v10l-2.5 2.5-2.5 2.5-2.5-2.5-2.5 2.5L4 14V4zm9 3v4h4v-4h-4z';

const scienceIcon = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z';

export const courseData: Subject[] = [
  {
    id: 'maths',
    name: 'Mathematics',
    icon: mathIcon,
    playlists: [
      {
        id: 'math-4-8-1',
        title: 'Maths Fundamentals',
        description: 'Core mathematical concepts for beginners',
        classRange: 'Class 4-8',
        url: 'https://youtube.com/playlist?list=PLSQl0a2vh4HCnw4O0QyV1G_WLFmOkCeXd',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 50
      },
      {
        id: 'math-4-8-2',
        title: 'Advanced Problem Solving',
        description: 'Enhance your problem-solving skills',
        classRange: 'Class 4-8',
        url: 'https://youtube.com/playlist?list=PLSQl0a2vh4HADvjXzE4rEo7B60J3RUScn',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 45
      },
      {
        id: 'math-4-8-3',
        title: 'Algebra Basics',
        description: 'Introduction to algebraic expressions and equations',
        classRange: 'Class 4-8',
        url: 'https://youtube.com/playlist?list=PLSQl0a2vh4HDJ85Bwgofo-57BWFCIlQfg',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 40
      },
      {
        id: 'math-4-8-4',
        title: 'Geometry & Measurement',
        description: 'Learn shapes, angles, and measurements',
        classRange: 'Class 4-8',
        url: 'https://youtube.com/playlist?list=PLSQl0a2vh4HCTD0d024o-gNSN_veZrWj_',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 35
      },
      {
        id: 'math-4-8-5',
        title: 'Number Systems',
        description: 'Understanding numbers and operations',
        classRange: 'Class 4-8',
        url: 'https://youtube.com/playlist?list=PLSQl0a2vh4HCthyyJ8XF1dcvenOkOmE6Q',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 38
      },
      {
        id: 'math-9-10-1',
        title: 'Advanced Algebra',
        description: 'Polynomial, quadratic equations and more',
        classRange: 'Class 9-10',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c-G30SACu_J66uL1CL9k4nb',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 55
      },
      {
        id: 'math-9-10-2',
        title: 'Trigonometry',
        description: 'Trigonometric ratios, identities and applications',
        classRange: 'Class 9-10',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c-4kIbLgOwNIisINbAh6Dtl',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 48
      },
      {
        id: 'math-9-10-3',
        title: 'Coordinate Geometry',
        description: 'Lines, circles, and conic sections',
        classRange: 'Class 9-10',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c_VmMrfYdqWz1OW8V4SxfZp',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 42
      },
      {
        id: 'math-9-10-4',
        title: 'Statistics & Probability',
        description: 'Data handling and probability concepts',
        classRange: 'Class 9-10',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c-NDhGs27hBdQev-N-B7qK0',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 36
      },
      {
        id: 'math-9-10-5',
        title: 'Calculus Introduction',
        description: 'Limits, derivatives and integrals basics',
        classRange: 'Class 9-10',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c_5nZA0GJFf6Z2mdDgyKoGj',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 52
      }
    ]
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: scienceIcon,
    playlists: [
      {
        id: 'phys-6-8-1',
        title: 'Motion & Forces',
        description: 'Understanding motion, speed, velocity and force',
        classRange: 'Class 6-8',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c_8QMcq07sr57GRHSv0l3wd',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 44
      },
      {
        id: 'phys-6-8-2',
        title: 'Light & Optics',
        description: 'Reflection, refraction and optical instruments',
        classRange: 'Class 6-8',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c8CnjJn6_5M5vUbqQEsS7Bq',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 38
      },
      {
        id: 'phys-6-8-3',
        title: 'Heat & Temperature',
        description: 'Thermal energy and heat transfer',
        classRange: 'Class 6-8',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c-SEkKkmD-doFqmx6vSa1_4',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 35
      },
      {
        id: 'phys-6-8-4',
        title: 'Electricity & Magnetism',
        description: 'Electric circuits and magnetic effects',
        classRange: 'Class 6-8',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c-hdmOeKxp8n386MPXzT33r',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 40
      },
      {
        id: 'phys-6-8-5',
        title: 'Sound Waves',
        description: 'Properties of sound and wave behavior',
        classRange: 'Class 6-8',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c-1kTN53bz6AcxSKAksFmL_',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 32
      },
      {
        id: 'phys-6-8-6',
        title: 'Work, Energy & Power',
        description: 'Understanding energy and its transformations',
        classRange: 'Class 6-8',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c-DTMkjIxmQxy7TfUa7pYmn',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 36
      }
    ]
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: scienceIcon,
    playlists: [
      {
        id: 'chem-6-8-1',
        title: 'Matter & Its Properties',
        description: 'States of matter and physical properties',
        classRange: 'Class 6-8',
        url: 'https://youtube.com/playlist?list=PLSQl0a2vh4HCnw4O0QyV1G_WLFmOkCeXd',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 30
      },
      {
        id: 'chem-9-10-1',
        title: 'Atomic Structure',
        description: 'Atoms, molecules and chemical bonding',
        classRange: 'Class 9-10',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c-G30SACu_J66uL1CL9k4nb',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 45
      }
    ]
  },
  {
    id: 'biology',
    name: 'Biology',
    icon: scienceIcon,
    playlists: [
      {
        id: 'bio-6-8-1',
        title: 'Living Organisms',
        description: 'Characteristics of living things',
        classRange: 'Class 6-8',
        url: 'https://youtube.com/playlist?list=PLSQl0a2vh4HCnw4O0QyV1G_WLFmOkCeXd',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 35
      },
      {
        id: 'bio-9-10-1',
        title: 'Cell Biology',
        description: 'Cell structure and functions',
        classRange: 'Class 9-10',
        url: 'https://youtube.com/playlist?list=PLCFgGyu6w8c-G30SACu_J66uL1CL9k4nb',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        videoCount: 50
      }
    ]
  }
];
