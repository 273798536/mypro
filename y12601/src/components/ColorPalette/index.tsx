import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type { PaletteColor } from '@/types/staining'
import styles from './index.module.scss'

interface Props {
  colors: PaletteColor[]
  selectedIndex: number
  onSelect: (index: number) => void
}

const ColorPalette: React.FC<Props> = ({ colors, selectedIndex, onSelect }) => {
  return (
    <View className={styles.palette}>
      {colors.map((color) => (
        <View
          key={color.index}
          className={classnames(
            styles.colorItem,
            selectedIndex === color.index && styles.selected,
          )}
          onClick={() => onSelect(color.index)}
        >
          <View
            className={styles.colorCircle}
            style={{ backgroundColor: color.hex }}
          />
          <Text className={styles.colorName}>{color.name}</Text>
        </View>
      ))}
    </View>
  )
}

export default ColorPalette
