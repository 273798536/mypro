using UnityEngine;

public class AudioManager : MonoBehaviour
{
    public AudioSource audioSource;
    
    void Start()
    {
        audioSource.clip = Resources.Load<AudioClip>("assets/sfx/jump.wav");
    }
    
    public void PlayJumpSound()
    {
        audioSource.Play();
    }
    
    public void PlayClickSound()
    {
        AudioClip click = Resources.Load<AudioClip>("assets/ui/click.wav");
        audioSource.PlayOneShot(click);
    }
    
    public void PlayBGM()
    {
        AudioClip bgm = Resources.Load<AudioClip>("assets/bgm/level1.wav");
        audioSource.clip = bgm;
        audioSource.loop = true;
        audioSource.Play();
    }
}
